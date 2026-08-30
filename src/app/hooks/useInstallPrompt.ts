"use client";

import { useState, useEffect } from "react";

import { isIOS, isInAppBrowser, isStandalonePWA } from "@app/utils/platform";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// 3日間は再表示しない
const DISMISS_KEY = "pwa_install_dismissed_at";
const DISMISS_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

// beforeinstallprompt はページ読み込みの少しあとに非同期で飛んでくる。
// 発火を待たずに同じ位置の別バナー(Web Push の soft ask)を出すと、直後に
// 追加バナーへ入れ替わってちらつくため、発火するかどうかが分かるまでの猶予を持つ。
const INSTALL_EVENT_GRACE_MS = 1500;

export type InstallState = "idle" | "android" | "ios";

function isRecentlyDismissed(): boolean {
  const dismissedAt = localStorage.getItem(DISMISS_KEY);

  return dismissedAt !== null && Date.now() - Number(dismissedAt) < DISMISS_DURATION_MS;
}

export function useInstallPrompt() {
  const [installState, setInstallState] = useState<InstallState>("idle");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // beforeinstallprompt が飛んでくるかどうかを待っている最中か(PwaBanners が参照する)
  const [awaitingInstallEvent, setAwaitingInstallEvent] = useState(false);

  useEffect(() => {
    // スタンドアロン（インストール済み）なら非表示
    if (isStandalonePWA()) return;

    // 最近閉じた場合は非表示
    if (isRecentlyDismissed()) return;

    // LINEやXのアプリ内ブラウザ(WebView)には「ホーム画面に追加」自体が無いため、
    // 案内しても実行できない。iOSではWebViewからSafariを開く公式手段も無い
    // （platform.ts の canOpenInExternalBrowser）ので、ここでは何も出さない。
    if (isInAppBrowser()) return;

    // iOS は beforeinstallprompt が発火せず、プログラムからインストールを起動する手段も無い。
    // ユーザー自身に「共有」→「ホーム画面に追加」を辿ってもらうしかないため、
    // Android のようなボタンではなく手順を案内する状態にする。
    // iOSのWeb Pushはホーム画面に追加したPWAでしか受け取れず、この案内が出ないと
    // iOSユーザーには通知が一切届かない（B1_B2_PUSH_NOTIFICATION_PLAN.md §2）。
    if (isIOS()) {
      setInstallState("ios");
      return;
    }

    // Android / Chrome: beforeinstallprompt を待つ
    setAwaitingInstallEvent(true);
    const graceTimer = setTimeout(() => setAwaitingInstallEvent(false), INSTALL_EVENT_GRACE_MS);

    const handler = (e: Event) => {
      e.preventDefault();
      setAwaitingInstallEvent(false);
      // ナビゲーション後に再発火した場合に備えてここでも確認
      if (isRecentlyDismissed()) return;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallState("android");
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      clearTimeout(graceTimer);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstallState("idle");
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setInstallState("idle");
  };

  return { installState, install, dismiss, awaitingInstallEvent };
}
