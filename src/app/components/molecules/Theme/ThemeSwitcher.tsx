"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@heroui/react";
import { LuSun, LuMoon } from "react-icons/lu";

// ライト/ダークを手動で切り替えるトグルボタン
export default function ThemeSwitcher() {
  // SSRとクライアントの不一致を避けるため、マウント後に描画する
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // マウント前はレイアウトを崩さないようプレースホルダを表示
  if (!mounted) {
    return (
      <Button
        isIconOnly
        variant="light"
        radius="full"
        aria-label="テーマ切り替え"
        className="text-white/70"
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <Button
      isIconOnly
      variant="light"
      radius="full"
      aria-label={isDark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      className="text-white/70 hover:text-white"
      onPress={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <LuSun className="text-xl drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
      ) : (
        <LuMoon className="text-xl" />
      )}
    </Button>
  );
}
