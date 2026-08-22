// 月次レポート(/users/report)で使う "YYYY-MM" 形式の年月ユーティリティ。
//
// 月の境界は JST で判定する。端末のタイムゾーンで判定すると、海外在住のユーザーで
// 月初・月末が1日ずれるため、日付は必ず utils/date.ts の JST 変換を通してから扱う。

import { todayJSTDateString } from "@app/utils/date";

const YEAR_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

// "YYYY-MM" として妥当かを返す。URLのパラメータを受け取る側で使う。
export function isValidYearMonth(value: string): boolean {
  return YEAR_MONTH_PATTERN.test(value);
}

// JSTでの当月を "YYYY-MM" で返す。
export function currentYearMonth(): string {
  return todayJSTDateString().slice(0, 7);
}

// "2026-08" → "2026年8月"
export function yearMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `${year}年${Number(month)}月`;
}

// "2026-08" → "2026.08"（シェア画像の隅に置く短い表記）
export function shortYearMonthLabel(yearMonth: string): string {
  return yearMonth.replace("-", ".");
}

// "2026-08" → "8月"
export function monthOnlyLabel(yearMonth: string): string {
  return `${Number(yearMonth.split("-")[1])}月`;
}

// 指定月に delta ヶ月を足した "YYYY-MM" を返す（負数で過去へ）。
export function addMonths(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split("-").map(Number);
  // Date の月は 0 始まり。月末日を持たない月へまたぐと日付が繰り上がるため、常に1日で作る。
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// 当月より後（未来の月）かどうか。月セレクタで次の月へ進めるかの判定に使う。
export function isFutureYearMonth(yearMonth: string): boolean {
  return yearMonth > currentYearMonth();
}

// その月の日数。
export function daysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split("-").map(Number);
  // 翌月の0日 = 当月の末日
  return new Date(year, month, 0).getDate();
}

// "2026-08" → "08/01 - 08/31"
export function monthRangeLabel(yearMonth: string): string {
  const month = yearMonth.split("-")[1];
  return `${month}/01 - ${month}/${String(daysInMonth(yearMonth)).padStart(2, "0")}`;
}
