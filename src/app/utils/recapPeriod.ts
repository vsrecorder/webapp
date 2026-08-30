// ふりかえりレポートの対象期間。
//
// 週次(/users/report/weeks/[week])・月次(/users/report/[yearMonth])・
// 環境別(/users/report/environments/[id])で集計APIに渡すパラメータもカードの言い回しも
// 変わるため、期間の種類をここに畳んで各カードは「期間の見出し」「集計クエリ」だけを
// 見ればよい形にする。
//
// 対象にできる期間は意図的に絞ってある（→ selectableMonths / selectableEnvironments）。
// 記録の無い月や、まだ記録を始める前の環境まで並べても選ぶ意味がないため。

import { EnvironmentType } from "@app/types/environment";
import { UserStatMonthlyType } from "@app/types/user_stat_history";
import { toJSTDate } from "@app/utils/date";
import {
  lastWeekValue,
  shortWeekRangeLabel,
  sundayOfWeekValue,
  weekRangeLabel,
} from "@app/utils/week";
import {
  addMonths,
  monthOnlyLabel,
  shortYearMonthLabel,
  yearMonthLabel,
} from "@app/utils/yearMonth";

export type RecapPeriod =
  // week は週の月曜日 "YYYY-MM-DD"（core-api の week パラメータ・utils/week.ts と同じ形式）
  | { kind: "week"; week: string }
  | { kind: "month"; yearMonth: string }
  | { kind: "environment"; environment: EnvironmentType };

/*
 * 集計APIに渡すクエリ。stat / deck-usage / opponent-deck-usage で共通。
 *
 * レギュレーションは絞らない（サーバ側は未指定を「絞り込みなし」として扱うため、
 * スタンダード・エクストラ・殿堂をすべて合算する）。
 *
 * ★ 比較相手のプラットフォーム集計(weekly_deck_usage)はスタンダード限定である点に注意。
 *   「あなたが当たった割合」と「環境全体での使用率」は分母の条件が揃っていないので、
 *   カード側では環境の数字がスタンダード基準であることを明記している。
 */
export function periodQuery(period: RecapPeriod): string {
  if (period.kind === "week") return `week=${period.week}`;
  return period.kind === "month"
    ? `year_month=${period.yearMonth}`
    : `environment_id=${period.environment.id}`;
}

// URL のパス。週は /users/report/weeks/2026-08-17、月は /users/report/2026-08、
// 環境は /users/report/environments/{id}
export function periodHref(period: RecapPeriod): string {
  if (period.kind === "week") return `/users/report/weeks/${period.week}`;
  return period.kind === "month"
    ? `/users/report/${period.yearMonth}`
    : `/users/report/environments/${period.environment.id}`;
}

// 同じ期間か（セレクタの選択状態の判定に使う）
export function periodValue(period: RecapPeriod): string {
  if (period.kind === "week") return `week:${period.week}`;
  return period.kind === "month" ? period.yearMonth : `env:${period.environment.id}`;
}

// レポート上部の英字ラベル。一覧のタイルと同じ呼び方に揃えてある
export function periodKindLabel(period: RecapPeriod): string {
  if (period.kind === "week") return "WEEKLY REPORT";
  return period.kind === "month" ? "MONTHLY REPORT" : "ENVIRONMENT REPORT";
}

function jstYearMonth(date: Date | string): string {
  return toJSTDate(date).toISOString().slice(0, 7);
}

// カード右上の短いラベル。週は "08.17 - 08.23"、月は "2026.08"、
// 環境は "2026.03 - 06"（年をまたぐなら両方に年を出す）
export function periodShortLabel(period: RecapPeriod): string {
  if (period.kind === "week") return shortWeekRangeLabel(period.week);
  if (period.kind === "month") return shortYearMonthLabel(period.yearMonth);

  const from = jstYearMonth(period.environment.from_date);
  const to = jstYearMonth(period.environment.to_date);
  const [fromYear] = from.split("-");
  const [toYear, toMonth] = to.split("-");

  return fromYear === toYear
    ? `${from.replace("-", ".")} - ${toMonth}`
    : `${from.replace("-", ".")} - ${toYear}.${toMonth}`;
}

// 一覧やページタイトルで使う名前。週は "8/17〜8/23の週"、月は "2026年8月"、
// 環境は "『メガリザードンex』環境"
export function periodTitle(period: RecapPeriod): string {
  if (period.kind === "week") return `${weekRangeLabel(period.week)}の週`;
  return period.kind === "month"
    ? yearMonthLabel(period.yearMonth)
    : `『${period.environment.title}』環境`;
}

// 本文で主語の前に置く言い回し。週は「8/17〜8/23の週、」、月は「8月、」、
// 環境は「『メガリザードンex』環境で、」。
// 環境名は長くなりうるが、どの環境のレポートかは本文で名指しする方が伝わるため、
// 折り返す前提で入れている（受け側は行の折り返しを許容すること）。
export function periodSubjectPrefix(period: RecapPeriod): string {
  if (period.kind === "week") return `${weekRangeLabel(period.week)}の週、`;
  return period.kind === "month"
    ? `${monthOnlyLabel(period.yearMonth)}、`
    : `『${period.environment.title}』環境で、`;
}

// 「8月の相棒デッキは」「『アビスアイ』環境の相棒デッキは」のような連体修飾。
// periodSubjectPrefix と同じく環境名を名指しする（受け側は行の折り返しを許容すること）。
export function periodPossessive(period: RecapPeriod): string {
  if (period.kind === "week") return `${weekRangeLabel(period.week)}の週`;
  return period.kind === "month"
    ? monthOnlyLabel(period.yearMonth)
    : `『${period.environment.title}』環境`;
}

/*
 * 見出しのフォントサイズ。環境名が長いと見出しが3行以上になり、
 * 1080×1350 のレポートから中身が溢れる（ヘッダーに重なる）ため、名前の長さで字を詰める。
 * 月と、短い環境名では base のまま。
 */
export function periodHeadingFontSize(period: RecapPeriod, base: number): number {
  if (period.kind !== "environment") return base;

  const length = [...period.environment.title].length;
  if (length <= 8) return base;
  if (length <= 14) return Math.round(base * 0.85);
  if (length <= 22) return Math.round(base * 0.72);
  // ここまで来ると見出しだけで3行になり、下の内容ごと溢れる。2行に収まる大きさまで落とす
  return Math.round(base * 0.6);
}

// 締めのカードで「次はいつ」と呼びかける言い回し。
// 週は、先週のレポートなら「今週も」、それより前の週を後から開いたときは「次の週も」
// (通知の履歴から数週後に開いても「今週」と言わないように)。
// 月は翌月を名指しし、環境は次が何になるか分からないので「次の環境」に留める。
export function periodNextLabel(period: RecapPeriod): string {
  switch (period.kind) {
    case "week":
      return period.week === lastWeekValue() ? "今週" : "次の週";
    case "month":
      return monthOnlyLabel(addMonths(period.yearMonth, 1));
    case "environment":
      return "次の環境";
  }
}

// 集計に使う日付の範囲（環境データの突き合わせで、対象の週を割り出すのに使う）
export function periodDateRange(period: RecapPeriod): { from: Date; to: Date } {
  if (period.kind === "week") {
    const [y1, m1, d1] = period.week.split("-").map(Number);
    const [y2, m2, d2] = sundayOfWeekValue(period.week).split("-").map(Number);
    return { from: new Date(y1, m1 - 1, d1), to: new Date(y2, m2 - 1, d2) };
  }

  if (period.kind === "month") {
    const [year, month] = period.yearMonth.split("-").map(Number);
    return { from: new Date(year, month - 1, 1), to: new Date(year, month, 0) };
  }

  const from = toJSTDate(period.environment.from_date);
  const to = toJSTDate(period.environment.to_date);
  // toJSTDate はUTCゲッターで読む前提のズラした値なので、暦日だけを取り出して作り直す
  return {
    from: new Date(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
    to: new Date(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()),
  };
}

// 選べる月を新しい順に返す。記録のある月だけに絞り、当月は記録が無くても必ず入れる
// （その月のふりかえりを開いて「まだ記録がありません」を見せたいのは当月だけのため）。
export function selectableMonths(
  history: UserStatMonthlyType[],
  currentMonth: string,
): string[] {
  const months = new Set<string>([currentMonth]);
  for (const row of history) {
    if (row.total_matches > 0) months.add(row.year_month);
  }
  return [...months].sort().reverse();
}

// 記録のある環境だけを、終了日の新しい順に返す。
// 「最初の記録より前に終わった環境」と「まだ始まっていない環境」は落とす。
// 並びの基準を終了日にしているのは、一覧が時系列で混ぜて並べるときと同じ物差しにするため。
export function selectableEnvironments(
  environments: EnvironmentType[],
  oldestRecordDate: string | null,
): EnvironmentType[] {
  // 記録が1件も無ければ、どの環境にもレポートは作れない。
  // ここで空にしないと、記録ゼロの人の一覧に空の環境タイルだけが並んでしまう。
  if (!oldestRecordDate) return [];

  const today = new Date();
  const oldest = new Date(oldestRecordDate);

  return [...environments]
    .filter((env) => {
      const from = new Date(env.from_date);
      const to = new Date(env.to_date);
      if (from > today) return false;
      if (to < oldest) return false;
      return true;
    })
    .sort((a, b) => new Date(b.to_date).getTime() - new Date(a.to_date).getTime());
}
