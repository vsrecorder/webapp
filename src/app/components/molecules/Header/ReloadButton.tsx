"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { LuRefreshCw } from "react-icons/lu";

import { useClientValue } from "@app/hooks/useClientValue";
import { isIOSPWA as detectIOSPWA } from "@app/utils/platform";

// 現在のページを再読み込みするボタン
export default function ReloadButton() {
  const [isSpinning, setIsSpinning] = useState(false);
  // iOS の PWA（ホーム画面から起動した standalone 表示）には pull-to-refresh が無いため、
  // 画面幅に関わらずリロード手段を常設する。ブラウザ表示（Safari タブ）では対象外。
  // サーバ描画では判定できないので、ハイドレーション後に実際の値へ差し替わる
  const isIOSPWA = useClientValue(detectIOSPWA, false);

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
