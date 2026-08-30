// 週次デッキ使用率ページの週セレクタ用ユーティリティ。
// 週は月曜始まりとし、値は週の月曜日を "YYYY-MM-DD" で表す（core-api の week パラメータ形式と一致）。

import { toJSTDateString, todayJSTDateString } from "@app/utils/date";

// 指定日が属する週の月曜日を返す。
function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // getDay: 日曜=0 ... 土曜=6。月曜始まりの経過日数へ変換する。
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 今週（今日が属する週）の月曜日を "YYYY-MM-DD" で返す。
export function currentWeekValue(): string {
  return formatDate(mondayOf(new Date()));
}

// 先週（今週の1つ前の週）の月曜日を "YYYY-MM-DD" で返す。
// 今週はまだ記録が途中経過で使用率が変動しやすいため、デフォルト表示には先週を使う。
export function lastWeekValue(): string {
  const monday = mondayOf(new Date());
  monday.setDate(monday.getDate() - 7);
  return formatDate(monday);
}

// JSTの暦日 "YYYY-MM-DD" が属する週の月曜日を "YYYY-MM-DD" で返す。
// 暦日の文字列をUTCとして扱って計算するため、端末のタイムゾーンに影響されない。
export function mondayOfJSTDateString(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  // getUTCDay: 日曜=0 ... 土曜=6。月曜始まりの経過日数へ変換する。
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

// 指定日(JSTの暦日として解釈)が属する週の月曜日を "YYYY-MM-DD" で返す。
// 過去の記録から「対戦当時の環境週」を求めるときに使う。不正な日付は "" を返す。
export function weekValueOfJSTDate(date: string | Date): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return mondayOfJSTDateString(toJSTDateString(d));
}

// 指定日が今週（JSTの今日が属する月曜始まりの週）に含まれるかを返す。
// 記録の開催日(event_date)は JST 0:00 をUTC変換した値で返るため、比較の前にJSTの暦日へ
// 直してから判定する（端末のタイムゾーンのまま判定すると海外在住のユーザーで前日に寄る）。
export function isInCurrentWeekJST(date: string | Date): boolean {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  return (
    mondayOfJSTDateString(toJSTDateString(d)) ===
    mondayOfJSTDateString(todayJSTDateString())
  );
}

// 直近 count 週分の週セレクタ選択肢を新しい週順で生成する。
// 例: { value: "2026-06-29", label: "6/29〜7/5 の週" }
export function generateWeekOptions(count = 12): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const monday = mondayOf(new Date());

  for (let i = 0; i < count; i++) {
    const start = new Date(monday);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const label = `${start.getMonth() + 1}/${start.getDate()}〜${end.getMonth() + 1}/${end.getDate()} の週`;
    options.push({ value: formatDate(start), label });
  }

  return options;
}

const WEEK_VALUE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// "YYYY-MM-DD" かつ月曜日か。週次レポートのURL(/users/report/weeks/[week])の検証に使う。
// 週の値は必ず月曜日で表す約束にしているため、月曜以外の日付は不正として扱う
// （正規化して受け入れると同じ週に7つのURLができてしまう）。
export function isValidWeekValue(value: string): boolean {
  if (!WEEK_VALUE_PATTERN.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  // "2026-02-30" のような存在しない日付は Date が繰り上げるので、往復して一致するかで弾く
  if (d.toISOString().slice(0, 10) !== value) return false;
  // getUTCDay: 日曜=0 ... 土曜=6
  return d.getUTCDay() === 1;
}

// 週(月曜)の "YYYY-MM-DD" から、その週の日曜日を "YYYY-MM-DD" で返す。
export function sundayOfWeekValue(week: string): string {
  const d = new Date(`${week}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

// "2026-08-17" → "8/17〜8/23"（generateWeekOptions のラベルと同じ言い回し）
export function weekRangeLabel(week: string): string {
  const [, m1, d1] = week.split("-").map(Number);
  const [, m2, d2] = sundayOfWeekValue(week).split("-").map(Number);
  return `${m1}/${d1}〜${m2}/${d2}`;
}

// "2026-08-17" → "08.17 - 08.23"（シェア画像の隅に置く短い表記。月次の "2026.08" と揃える）
export function shortWeekRangeLabel(week: string): string {
  const [, m1, d1] = week.split("-");
  const [, m2, d2] = sundayOfWeekValue(week).split("-");
  return `${m1}.${d1} - ${m2}.${d2}`;
}
