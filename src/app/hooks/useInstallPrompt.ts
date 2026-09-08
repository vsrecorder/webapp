"use client";

import { useState, useEffect } from "react";

import { useClientValue } from "@app/hooks/useClientValue";
import { useLocalStorageItem } from "@app/hooks/useLocalStorageItem";
import { writeLocalStorage } from "@app/utils/localStorageStore";
import { isIOS, isInAppBrowser, isStandalonePWA } from "@app/utils/platform";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// 7日間は再表示しない
const DISMISS_KEY = "pwa_install_dismissed_at";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// beforeinstallprompt はページ読み込みの少しあとに非同期で飛んでくる。
// 発火を待たずに同じ位置の別バナー(Web Push の soft ask)を出すと、直後に
// 追加バナーへ入れ替わってちらつくため、発火するかどうかが分かるまでの猶予を持つ。
const INSTALL_EVENT_GRACE_MS = 1500;

export type InstallState = "idle" | "android" | "ios";

// どの案内の対象となる環境か。サーバ描画では判定できないので "none" にしておく
type Platform = "none" | "ios" | "android";

function detectPlatform(): Platform {
  // スタンドアロン（インストール済み）なら非表示
  if (isStandalonePWA()) return "none";

  // LINEやXのアプリ内ブラウザ(WebView)には「ホーム画面に追加」自体が無いため、
  // 案内しても実行できない。iOSではWebViewからSafariを開く公式手段も無い
  // （platform.ts の canOpenInExternalBrowser）ので、ここでは何も出さない。
  if (isInAppBrowser()) return "none";

  // iOS は beforeinstallprompt が発火せず、プログラムからインストールを起動する手段も無い。
  // ユーザー自身に「共有」→「ホーム画面に追加」を辿ってもらうしかないため、
  // Android のようなボタンではなく手順を案内する状態にする。
  // iOSのWeb Pushはホーム画面に追加したPWAでしか受け取れず、この案内が出ないと
  // iOSユーザーには通知が一切届かない（B1_B2_PUSH_NOTIFICATION_PLAN.md §2）。
  if (isIOS()) return "ios";

  // Android / Chrome: beforeinstallprompt を待つ
  return "android";
}

function isRecentlyDismissedAt(dismissedAt: string | null): boolean {
  return dismissedAt !== null && Date.now() - Number(dismissedAt) < DISMISS_DURATION_MS;
}

/*
 * 表示状態(installState / awaitingInstallEvent)は effect で組み立てず、環境の判定・
 * 閉じた日時(localStorage)・受け取ったイベントから描画中に導く。
 * サーバ描画では環境が分からないので "idle"(何も出さない)になり、ハイドレーション後に
 * 実際の環境の値へ差し替わる。
 */
export function useInstallPrompt() {
  const platform = useClientValue(detectPlatform, "none");
  const dismissedAt = useLocalStorageItem(DISMISS_KEY);
  // 最近閉じた場合は非表示
  const recentlyDismissed = isRecentlyDismissedAt(dismissedAt);

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // beforeinstallprompt を一度でも受け取ったか。deferredPrompt とは別に持つのは、
  // 受け取ったが使わない(閉じた直後の再発火)場合にも「発火待ち」を終えるため
  const [installEventSeen, setInstallEventSeen] = useState(false);
  // 発火待ちの猶予が過ぎたか
  const [graceElapsed, setGraceElapsed] = useState(false);
  // ネイティブのインストール確認を受け入れた(案内の役目は終わり)
  const [installAccepted, setInstallAccepted] = useState(false);

  useEffect(() => {
    if (platform !== "android" || recentlyDismissed) return;

    const graceTimer = setTimeout(() => setGraceElapsed(true), INSTALL_EVENT_GRACE_MS);

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEventSeen(true);
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      clearTimeout(graceTimer);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [platform, recentlyDismissed]);

  // beforeinstallprompt が飛んでくるかどうかを待っている最中か(PwaBanners が参照する)
  const awaitingInstallEvent =
    platform === "android" && !recentlyDismissed && !graceElapsed && !installEventSeen;

  let installState: InstallState = "idle";
  if (!recentlyDismissed) {
    if (platform === "ios") {
      installState = "ios";
    } else if (platform === "android" && installEventSeen && !installAccepted) {
      installState = "android";
    }
  }

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstallAccepted(true);
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    writeLocalStorage(DISMISS_KEY, String(Date.now()));
  };

  return { installState, install, dismiss, awaitingInstallEvent };
}
