import { shiftDateString } from "@app/utils/cityleagueListPage";
import { formatJSTDateWithWeekday, toJSTDateString } from "@app/utils/date";

/*
 * シティリーグ結果を「開催日ごと」に見るページ(/cityleague_results/dates/[date])で使う、
 * 開催日の扱い。URL には JST の暦日を "YYYY-MM-DD" で載せる。
 *
 * ブラウザからも使えるよう、取得を伴わない純粋な関数だけをここに置く。
 */

// 開催日(上流は JST 0:00 を UTC に直した値を返す)を、URL に載せる暦日にする
export function toDateParam(date: Date | string): string {
  return toJSTDateString(date);
}

// URL の日付が実在する暦日("YYYY-MM-DD")ならそれを返す。形式違いや存在しない日(2026-02-30)は null
export function parseDateParam(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  // 存在しない日は Date が繰り上げる(02-30 → 03-02)ので、ずらさずに組み直して一致を見る
  return shiftDateString(value, 0) === value ? value : null;
}

// 「2026年9月26日(土)」
export function formatDateParam(dateParam: string): string {
  return formatJSTDateWithWeekday(`${dateParam}T00:00:00+09:00`);
}

// 開催日が属する開催月のキー("2026-09")。開催月ページ(/cityleague_results/months/[month])へ繋ぐため
export function dateParamToMonthKey(dateParam: string): string {
  return dateParam.slice(0, 7);
}
