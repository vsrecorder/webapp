import { WeeklyDeckUsageGroupingType } from "@app/types/weekly_deck_usage_stat";

// 対戦環境分析(週次デッキ使用率)の集計単位。
// URLのクエリ・APIの proxy・パネルの状態で同じ値を扱うため、正規化はここに一本化する。
export const DECK_USAGE_GROUPINGS: WeeklyDeckUsageGroupingType[] = [
  "exact",
  "first_sprite",
];

// 既定の集計単位(スプライトの組み合わせが一致するものだけを同じデッキとして数える)
export const DEFAULT_DECK_USAGE_GROUPING: WeeklyDeckUsageGroupingType = "exact";

// 画面の初期表示(対戦環境分析パネル・ダッシュボードの環境カード)。組み合わせ単位だと
// 派生に票が割れて系統の強さが見えにくいため、1体目でまとめた集計から見せる。
// (grouping 未指定の API の既定は DEFAULT_DECK_USAGE_GROUPING のまま)
export const UI_DEFAULT_DECK_USAGE_GROUPING: WeeklyDeckUsageGroupingType =
  "first_sprite";

/*
 * クエリ文字列などの自由な入力を集計単位へ正規化する。
 * 未指定・未知の値は既定へ寄せる。core-api は未知の値を 400 にするため、
 * ユーザーがURLを手で書き換えてもページがエラーにならないよう手前で潰しておく。
 */
export function normalizeDeckUsageGrouping(
  value: string | null | undefined,
  fallback: WeeklyDeckUsageGroupingType = DEFAULT_DECK_USAGE_GROUPING,
): WeeklyDeckUsageGroupingType {
  return DECK_USAGE_GROUPINGS.find((g) => g === value) ?? fallback;
}
