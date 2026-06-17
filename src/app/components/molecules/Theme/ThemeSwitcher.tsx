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
        className="text-gray-700 dark:text-default-300"
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
      className="text-gray-700 dark:text-default-300"
      onPress={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        // ダークモード時は太陽アイコンを白くして目立たせる
        <LuSun className="text-xl text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
      ) : (
        <LuMoon className="text-xl" />
      )}
    </Button>
  );
}
