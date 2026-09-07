/*
 * シティリーグ結果一覧(/cityleague_results)の選択中タブ(オープン/シニア/ジュニア)の
 * 保存先と値の検証。
 *
 * 以前は sessionStorage に持ち、マウント後に読んで切り替えていた。サーバは storage を
 * 読めないのでサーバ描画は常にオープンリーグで描かれ、別のタブを選んでいた人は
 * ハイドレーション後に一覧が切り替わって見えていた。サーバで1ページ目を取って
 * HTML に載せるようにすると、どのタブのぶんを取るかをサーバが知る必要もある。
 * cookie なら cityleague_results/(index)/page.tsx が読める
 * (記録一覧の recordListPrefs・デッキ一覧の deckListPrefs と同じ考え方)。
 *
 * ここはサーバ・クライアント両方から import するので、ブラウザ専用の処理は置かない
 * (document.cookie の読み書きは utils/cityleagueSelectedTab)。
 */

// 以前の sessionStorage と同じキー名。ブラウザを閉じたらオープンリーグに戻したいので
// セッション cookie(有効期限なし)にする
export const CITYLEAGUE_SELECTED_TAB_COOKIE = "cityleagueResultsSelectedTab";

export type CityleagueTab = "league_type_1" | "league_type_3" | "league_type_2";

// 並び順は画面のタブと同じ(オープン → シニア → ジュニア)
export const CITYLEAGUE_TABS: readonly CityleagueTab[] = [
  "league_type_1",
  "league_type_3",
  "league_type_2",
];

export const DEFAULT_CITYLEAGUE_TAB: CityleagueTab = "league_type_1";

// cookie の値は誰でも書き換えられるので、既知の値以外は無視する
export function parseCityleagueTab(value: string | null | undefined): CityleagueTab | null {
  return (CITYLEAGUE_TABS as readonly string[]).includes(value ?? "")
    ? (value as CityleagueTab)
    : null;
}

// タブ → 上流の league_type
export function cityleagueTabToLeagueType(tab: CityleagueTab): number {
  return Number(tab.replace("league_type_", ""));
}

export function leagueTypeToCityleagueTab(leagueType: number): CityleagueTab {
  return `league_type_${leagueType}` as CityleagueTab;
}
