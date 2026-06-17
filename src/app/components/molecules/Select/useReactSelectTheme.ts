import { useTheme } from "next-themes";
import type { Theme } from "react-select";

// react-select / react-windowed-select はHeroUIのテーマに自動追従しないため、
// ダークモード時のみ配色（メニュー背景・文字色・枠線など）を上書きする。
// 各 <Select> / <WindowedSelect> の theme プロップに渡して使う。
export function useReactSelectTheme() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

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
