"use client";

import { useState, useEffect } from "react";
import { Button } from "@heroui/react";
import { LuRefreshCw } from "react-icons/lu";

// 現在のページを再読み込みするボタン
export default function ReloadButton() {
  const [isSpinning, setIsSpinning] = useState(false);
  const [isIOSPWA, setIsIOSPWA] = useState(false);

  useEffect(() => {
    // iOS の PWA（ホーム画面から起動した standalone 表示）には pull-to-refresh が無いため、
    // 画面幅に関わらずリロード手段を常設する。ブラウザ表示（Safari タブ）では対象外。
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as Navigator & { standalone: boolean }).standalone === true);
    setIsIOSPWA(isIOS && isStandalone);
  }, []);

  return (
    <Button
      isIconOnly
      variant="light"
      radius="full"
      aria-label="ページを再読み込み"
      className={`${isIOSPWA ? "inline-flex" : "hidden sm:inline-flex"} text-white/70 hover:text-white`}
      onPress={() => {
        setIsSpinning(true);
        window.location.reload();
      }}
    >
      <LuRefreshCw className={`text-xl ${isSpinning ? "animate-spin" : ""}`} />
    </Button>
  );
}
