import { useTheme } from "next-themes";
import type { Theme } from "react-select";

import { useClientValue } from "@app/hooks/useClientValue";

/*
 * 現在ダークモードが適用されているか。
 *
 * next-themes の resolvedTheme はマウント前(ハイドレーション前)に undefined を返すため、
 * その間は <html> の .dark クラスを直接見て実際の適用状態を判定する。これをしないと、
 * ページ本体はダーク表示なのにセレクターだけが既定(白)の配色になる。
 *
 * ただしこの判定を描画中にそのまま出してはいけない。サーバ描画では .dark を読めず必ず
 * ライトになるため、クライアントの最初の描画でダークにすると両者が食い違う。React は
 * 属性(ここでは emotion のクラス名)の不一致を修復しないので、サーバが書いたライトの
 * クラスが DOM に残り、しかも React 側の値は最初からダークのまま変化しないため
 * 二度と書き換えられない。結果、直したかったはずの「セレクターだけ白い」が
 * サーバ描画されるページ(記録作成)で永久に残っていた。
 *
 * useClientValue を通し、最初の描画はサーバと同じライトにする。ハイドレーション後に
 * 実際の値へ切り替わると、そこで初めてクラス名が変わるので React が DOM を書き換える。
 */
function useIsDark(): boolean {
  const { resolvedTheme } = useTheme();

  /*
   * 判定そのものを useClientValue に通す。resolvedTheme はハイドレーション時点で既に
   * 決まっていることがあり(実測)、それをそのまま返すとサーバ(必ずライト)と食い違う。
   * ここを通せば最初の描画は必ずサーバと同じライトになり、次の描画から実際の値になる。
   * resolvedTheme が変われば再描画されるので、テーマ切替にも追従する。
   */
  return useClientValue(
    () =>
      resolvedTheme
        ? resolvedTheme === "dark"
        : document.documentElement.classList.contains("dark"),
    false,
  );
}

// react-select / react-windowed-select はHeroUIのテーマに自動追従しないため、
// ダークモード時のみ配色（メニュー背景・文字色・枠線など）を上書きする。
// 各 <Select> / <WindowedSelect> の theme プロップに渡して使う。
export function useReactSelectTheme() {
  const isDark = useIsDark();

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
