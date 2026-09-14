import { WeeklyDeckUsageGroupingType } from "@app/types/weekly_deck_usage_stat";

// 対戦環境分析(週次デッキ使用率)の集計単位。
// URLのクエリ・APIの proxy・パネルの状態で同じ値を扱うため、正規化はここに一本化する。
export const DECK_USAGE_GROUPINGS: WeeklyDeckUsageGroupingType[] = ["exact", "first_sprite"];

// 既定の集計単位(スプライトの組み合わせが一致するものだけを同じデッキとして数える)
export const DEFAULT_DECK_USAGE_GROUPING: WeeklyDeckUsageGroupingType = "exact";

/*
 * クエリ文字列などの自由な入力を集計単位へ正規化する。
 * 未指定・未知の値は既定へ寄せる。core-api は未知の値を 400 にするため、
 * ユーザーがURLを手で書き換えてもページがエラーにならないよう手前で潰しておく。
 */
export function normalizeDeckUsageGrouping(
  value: string | null | undefined,
): WeeklyDeckUsageGroupingType {
  return DECK_USAGE_GROUPINGS.find((g) => g === value) ?? DEFAULT_DECK_USAGE_GROUPING;
}
