"use client";

import { useCallback, useEffect, useState } from "react";

import { isAndroid, isIOS, isIOSPWA, isStandalonePWA } from "@app/utils/platform";

/*
 * Web Push の購読状態と操作(B-1)。
 *
 * - support: この端末で購読できるか。iOS はホーム画面に追加した PWA でしか PushManager が
 *   生えないため、Safari のタブで開いている場合は "ios-needs-install" として区別する
 *   (許諾プロンプトは出さず、ホーム画面追加の案内に任せる)。
 * - permission: ブラウザの許諾状態。"denied" はブラウザ設定でしか戻せない。
 * - subscribed: この端末に購読があり、サーバにも登録済み(とみなせる)か。
 *
 * サーバ側の購読は endpoint で upsert されるため、既存の購読を1日1回だけ再送して
 * 「サーバ側で失効扱いになっている / 別ユーザーに紐づいている」ズレを自己修復する。
 */

export type PushSupport = "supported" | "unsupported" | "ios-needs-install";
export type PushPermission = NotificationPermission | "unsupported";

const RESYNC_KEY = "vsrec:push:resynced-on";

// navigator.serviceWorker.ready は SW の登録が失敗すると永遠に解決しない(拒否もされない)。
// その場合に ready が立たず UI が出ないままになるのを防ぐため、上限を置いて諦める。
const SERVICE_WORKER_READY_TIMEOUT_MS = 8000;

function serviceWorkerReady(): Promise<ServiceWorkerRegistration> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("service worker is not ready")),
      SERVICE_WORKER_READY_TIMEOUT_MS,
    );
    navigator.serviceWorker.ready.then(
      (registration) => {
        clearTimeout(timer);
        resolve(registration);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function detectSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";

  if (isIOS() && !isStandalonePWA()) return "ios-needs-install";

  const hasApi =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  return hasApi ? "supported" : "unsupported";
}

// 購読端末の種別。core-apiserver の entity.PushPlatform* と一致させる。
export function detectPushPlatform(): string {
  if (isIOSPWA()) return "ios-pwa";
  if (isAndroid()) return "android";
  return "desktop";
}

// VAPID 公開鍵(base64url)を PushManager.subscribe が受け取る形にする
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  // applicationServerKey は ArrayBuffer を裏に持つ typed array を要求する(SharedArrayBuffer 不可)
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function todayJST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
}

async function postSubscription(subscription: PushSubscription): Promise<boolean> {
  const json = subscription.toJSON();
  const res = await fetch("/api/users/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      platform: detectPushPlatform(),
    }),
  });
  return res.ok;
}

export function usePushSubscription() {
  const [ready, setReady] = useState(false);
  const [support, setSupport] = useState<PushSupport>("unsupported");
  const [permission, setPermission] = useState<PushPermission>("unsupported");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const detected = detectSupport();
      if (detected !== "supported") {
        if (!cancelled) {
          setSupport(detected);
          setReady(true);
        }
        return;
      }

      try {
        const registration = await serviceWorkerReady();
        const existing = await registration.pushManager.getSubscription();
        if (cancelled) return;

        const granted = Notification.permission === "granted";
        setSupport(detected);
        setPermission(Notification.permission);
        setSubscribed(existing !== null && granted);

        // 1日1回だけサーバへ再送して同期する(失敗しても表示には影響させない)
        if (existing && granted) {
          const today = todayJST();
          if (localStorage.getItem(RESYNC_KEY) !== today) {
            const ok = await postSubscription(existing).catch(() => false);
            if (ok) localStorage.setItem(RESYNC_KEY, today);
          }
        }
      } catch {
        // SW が使えない(登録失敗・タイムアウト)なら購読もできないので非対応として扱う
        if (!cancelled) {
          setSupport("unsupported");
          setPermission(Notification.permission);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 許諾を求め、許可されたら購読してサーバへ登録する。成功したら true。
  // 必ずユーザー操作(ボタン押下)を起点に呼ぶこと。
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (support !== "supported") return false;

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
      return false;
    }

    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return false;

      const registration = await serviceWorkerReady();
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));

      const ok = await postSubscription(subscription);
      if (!ok) throw new Error("failed to register push subscription");

      localStorage.setItem(RESYNC_KEY, todayJST());
      setSubscribed(true);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      setBusy(false);
    }
  }, [support]);

  // この端末の購読を解除し、サーバ側も revoke する。
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (support !== "supported") return false;

    setBusy(true);
    try {
      const registration = await serviceWorkerReady();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // サーバ側の解除が失敗しても端末側は解除する(送っても届かないだけで、
        // 失効は 410 で自動的に検知される)
        await fetch("/api/users/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => {});
        await subscription.unsubscribe();
      }
      localStorage.removeItem(RESYNC_KEY);
      setSubscribed(false);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      setBusy(false);
    }
  }, [support]);

  return { ready, support, permission, subscribed, busy, subscribe, unsubscribe };
}
