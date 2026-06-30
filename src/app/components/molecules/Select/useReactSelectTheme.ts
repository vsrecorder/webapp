import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import type { Theme } from "react-select";

// 現在ダークモードが適用されているかを判定する。
// next-themes の resolvedTheme はマウント前（ハイドレーション前）に undefined を返すため、
// その間は <html> の .dark クラスを直接参照して実際の適用状態を判定する。
// これをしないと、ページ本体はダーク表示なのにセレクターだけが
// 既定（白）の配色のまま描画され「時々セレクターが白い」状態になる。
function detectIsDark(resolvedTheme: string | undefined): boolean {
  if (resolvedTheme) return resolvedTheme === "dark";
  if (typeof document !== "undefined") {
    return document.documentElement.classList.contains("dark");
  }
  return false;
}

// react-select / react-windowed-select はHeroUIのテーマに自動追従しないため、
// ダークモード時のみ配色（メニュー背景・文字色・枠線など）を上書きする。
// 各 <Select> / <WindowedSelect> の theme プロップに渡して使う。
export function useReactSelectTheme() {
  const { resolvedTheme } = useTheme();
  // 初回描画時点（マウント前）でも <html> の .dark を見て正しい配色を当てる
  const [isDark, setIsDark] = useState(() => detectIsDark(resolvedTheme));

  // マウント後・テーマ切替後は resolvedTheme の変化に追従する
  useEffect(() => {
    setIsDark(detectIsDark(resolvedTheme));
  }, [resolvedTheme]);

  return (base: Theme): Theme => {
    // ライトモードは react-select の既定配色のまま
    if (!isDark) return base;

    return {
      ...base,
      colors: {
        ...base.colors,
        primary: "#3b82f6", // 選択中オプションの背景
        primary75: "#60a5fa",
        primary50: "#52525b", // オプションのアクティブ状態
        primary25: "#3f3f46", // オプションのホバー/フォーカス背景
        neutral0: "#27272a", // コントロール・メニューの背景
        neutral5: "#3f3f46",
        neutral10: "#3f3f46", // 複数選択タグなどの背景
        neutral20: "#52525b", // 枠線・区切り線
        neutral30: "#71717a", // ホバー時の枠線
        neutral40: "#a1a1aa", // インジケーター
        neutral50: "#a1a1aa", // プレースホルダ
        neutral60: "#d4d4d8",
        neutral70: "#e4e4e7",
        neutral80: "#f4f4f5", // 入力文字・選択値の文字色
        neutral90: "#fafafa",
      },
    };
  };
}
