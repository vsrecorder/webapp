/*
 * 記録一覧(/records)の選択中タブ(すべて/公式イベント/Tonamel/自由形式)の保存先と値の検証。
 *
 * 以前は sessionStorage に持ち、マウント後に読んで切り替えていた。サーバは storage を読めないので
 * サーバ描画は常に「すべて」で描かれ、別のタブを選んでいた人はハイドレーション後に一覧が
 * 切り替わって見えていた。サーバで1ページ目を取って HTML に載せるようにすると、どのタブの
 * 1ページ目を取るかをサーバが知る必要もある。cookie なら records/page.tsx が読める
 * (デッキ一覧の deckListPrefs と同じ考え方)。
 *
 * ここはサーバ・クライアント両方から import するので、ブラウザ専用の処理は置かない
 * (document.cookie の読み書きは utils/recordsSelectedTab)。
 */

// 以前の sessionStorage と同じく、ブラウザを閉じたら「すべて」に戻したいのでセッション cookie
export const RECORDS_SELECTED_TAB_COOKIE = "recordsSelectedTab";

export type RecordsTab = "all" | "official" | "tonamel" | "unofficial";

export const RECORDS_TABS: readonly RecordsTab[] = ["all", "official", "tonamel", "unofficial"];

// cookie の値は誰でも書き換えられるので、既知の値以外は無視する
export function parseRecordsTab(value: string | null | undefined): RecordsTab | null {
  return (RECORDS_TABS as readonly string[]).includes(value ?? "") ? (value as RecordsTab) : null;
}

// タブ → 一覧 API の event_type。「すべて」は絞り込みなし(空文字)
export function recordsTabToEventType(tab: RecordsTab): string {
  return tab === "all" ? "" : tab;
}
