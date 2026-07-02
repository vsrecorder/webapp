"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { LuRefreshCw } from "react-icons/lu";

// 現在のページを再読み込みするボタン
export default function ReloadButton() {
  const [isSpinning, setIsSpinning] = useState(false);

  return (
    <Button
      isIconOnly
      variant="light"
      radius="full"
      aria-label="ページを再読み込み"
      className="hidden sm:inline-flex text-white/70 hover:text-white"
      onPress={() => {
        setIsSpinning(true);
        window.location.reload();
      }}
    >
      <LuRefreshCw className={`text-xl ${isSpinning ? "animate-spin" : ""}`} />
    </Button>
  );
}
