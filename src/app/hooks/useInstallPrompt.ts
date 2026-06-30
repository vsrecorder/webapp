"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// 3日間は再表示しない
const DISMISS_KEY = "pwa_install_dismissed_at";
const DISMISS_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

export type InstallState = "idle" | "android" | "ios";

export function useInstallPrompt() {
  const [installState, setInstallState] = useState<InstallState>("idle");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // スタンドアロン（インストール済み）なら非表示
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as Navigator & { standalone: boolean }).standalone === true);
    if (isStandalone) return;

    // 最近閉じた場合は非表示
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_DURATION_MS) return;

    // iOS Safari 判定（beforeinstallprompt が発火しない環境）
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIOS && isSafari) {
      setInstallState("ios");
      return;
    }

    // Android / Chrome: beforeinstallprompt を待つ
    const handler = (e: Event) => {
      e.preventDefault();
      // ナビゲーション後に再発火した場合に備えてここでも確認
      const at = localStorage.getItem(DISMISS_KEY);
      if (at && Date.now() - Number(at) < DISMISS_DURATION_MS) return;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallState("android");
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
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

  return { installState, install, dismiss };
}
