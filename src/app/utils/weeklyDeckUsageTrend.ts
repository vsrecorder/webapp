import { addDays, isValidWeekValue } from "@app/utils/week";

import { WeeklyDeckUsageStatType } from "@app/types/weekly_deck_usage_stat";
import {
  WeeklyDeckUsageTrendPointType,
  WeeklyDeckUsageTrendSeriesType,
  WeeklyDeckUsageTrendType,
} from "@app/types/weekly_deck_usage_trend";

// 推移グラフの既定の週数と、線を引く順位の範囲
export const DECK_USAGE_TREND_WEEKS = 6;
export const DECK_USAGE_TREND_LIMIT = 30;

// 指定できる期間の週数。上限は、1週ごとに上流の集計を1回ずつ呼ぶための負荷と、
// スマホ幅で週の間隔が詰まりすぎない(12週で約20px)ことから決めている
export const DECK_USAGE_TREND_MIN_WEEKS = 2;
export const DECK_USAGE_TREND_MAX_WEEKS = 12;
// 期間の選択肢として遡れる週数(今週を含む)。集計がまとまって入り始めたのは
// 2026年6月下旬で、それより前は1週に数件しかない
export const DECK_USAGE_TREND_SELECTABLE_WEEKS = 26;

// 推移の対象期間。どちらも週の月曜日 "YYYY-MM-DD"(両端を含む)
export type DeckUsageTrendRange = { from: string; to: string };

// 期間に含まれる週数(両端を含む)。from > to なら 0 以下になる
export function trendWeekCount({ from, to }: DeckUsageTrendRange): number {
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
  return Math.round(days / 7) + 1;
}

// 期間に含まれる週の月曜日を古い順に返す
export function trendWeeks(range: DeckUsageTrendRange): string[] {
  return Array.from({ length: trendWeekCount(range) }, (_, i) => addDays(range.from, 7 * i));
}

// 既定の期間: 先週(集計が確定している最新の週)までの DECK_USAGE_TREND_WEEKS 週
export function defaultTrendRange(currentWeek: string): DeckUsageTrendRange {
  const to = addDays(currentWeek, -7);
  return { from: addDays(to, -7 * (DECK_USAGE_TREND_WEEKS - 1)), to };
}

/*
 * URL のクエリなど自由な入力を期間へ正規化する。月曜日でない・前後が逆・週数が範囲外・
 * 今週より先・選べる範囲(earliest)より前、のいずれかなら既定の期間にする。
 * 一部だけ直すと利用者が指定していない期間が出てしまうため、丸ごと既定へ戻す。
 */
export function normalizeTrendRange(
  from: string | null | undefined,
  to: string | null | undefined,
  currentWeek: string,
  earliest?: string,
): DeckUsageTrendRange {
  if (from && to && isValidWeekValue(from) && isValidWeekValue(to)) {
    const count = trendWeekCount({ from, to });
    if (
      count >= DECK_USAGE_TREND_MIN_WEEKS &&
      count <= DECK_USAGE_TREND_MAX_WEEKS &&
      to <= currentWeek &&
      (earliest == null || from >= earliest)
    ) {
      return { from, to };
    }
  }
  return defaultTrendRange(currentWeek);
}

/*
 * 期間の片端を選び直したときの新しい期間。選び直した端はそのまま使い、反対側の端だけを直す。
 * - 長くなりすぎた(上限の週数を超えた): 上限の週数まで縮める。端を外へ動かすのは
 *   期間を延ばしたいときなので、延ばせるところまでは延ばす
 * - 前後が逆・短すぎる: それまでの週数を保つように反対側をずらす
 *   (開始週を終了週より後ろへ動かしても、期間の長さが変わらない)
 * 両端は [earliest, latest] の中に収め、収めきれないときは最低の週数を保つ。
 */
export function changeTrendRangeEdge(
  range: DeckUsageTrendRange,
  edge: "from" | "to",
  value: string,
  earliest: string,
  latest: string,
): DeckUsageTrendRange {
  const span = Math.min(
    DECK_USAGE_TREND_MAX_WEEKS,
    Math.max(DECK_USAGE_TREND_MIN_WEEKS, trendWeekCount(range)),
  );
  const minWeek = (a: string, b: string) => (a < b ? a : b);
  const maxWeek = (a: string, b: string) => (a > b ? a : b);
  const weeksAfter = (week: string, n: number) => addDays(week, 7 * (n - 1));
  const weeksBefore = (week: string, n: number) => addDays(week, -7 * (n - 1));

  if (edge === "from") {
    const count = trendWeekCount({ from: value, to: range.to });
    let to = range.to;
    if (count > DECK_USAGE_TREND_MAX_WEEKS) to = weeksAfter(value, DECK_USAGE_TREND_MAX_WEEKS);
    if (count < DECK_USAGE_TREND_MIN_WEEKS) to = minWeek(latest, weeksAfter(value, span));
    // 最新の週の近くを選んで終了週を後ろへずらせないときは、開始週の方を前へ戻す
    const from = minWeek(value, weeksBefore(to, DECK_USAGE_TREND_MIN_WEEKS));
    return { from, to };
  }

  const count = trendWeekCount({ from: range.from, to: value });
  let from = range.from;
  if (count > DECK_USAGE_TREND_MAX_WEEKS) from = weeksBefore(value, DECK_USAGE_TREND_MAX_WEEKS);
  if (count < DECK_USAGE_TREND_MIN_WEEKS) from = maxWeek(earliest, weeksBefore(value, span));
  const to = maxWeek(value, weeksAfter(from, DECK_USAGE_TREND_MIN_WEEKS));
  return { from, to };
}

/*
 * 週次デッキ使用率(1体目でまとめた集計)を週ごとに突き合わせ、順位の推移に組み立てる。
 * stats は古い週が先頭。
 *
 * 順位はランキング表示と同じく「その他」を除いた個別行の並び順(使用率降順・同率は勝率降順。
 * サーバで整列済み)。「その他」に集約された変種は、使用率だけ内訳から拾い順位は付けない
 * (集約は少数変種の匿名化のためで、個別の順位としては公開していない)。
 *
 * いずれかの週で上位 limit 位に入った系列だけを返す。
 */
export function buildWeeklyDeckUsageTrend(
  stats: WeeklyDeckUsageStatType[],
  limit: number = DECK_USAGE_TREND_LIMIT,
): WeeklyDeckUsageTrendType {
  const weekCount = stats.length;
  const seriesByFingerprint = new Map<string, WeeklyDeckUsageTrendSeriesType>();

  const seriesOf = (
    fingerprint: string,
    sprites: WeeklyDeckUsageTrendSeriesType["pokemon_sprites"],
  ) => {
    let s = seriesByFingerprint.get(fingerprint);
    if (!s) {
      s = {
        fingerprint,
        pokemon_sprites: sprites,
        points: Array.from(
          { length: weekCount },
          (): WeeklyDeckUsageTrendPointType => ({ rank: null, usage_rate: null, count: 0 }),
        ),
      };
      seriesByFingerprint.set(fingerprint, s);
    }
    return s;
  };

  stats.forEach((stat, weekIdx) => {
    let rank = 0;
    for (const deck of stat.decks ?? []) {
      if (deck.fingerprint === "") {
        for (const m of deck.members ?? []) {
          if (m.fingerprint === "") continue;
          seriesOf(m.fingerprint, m.pokemon_sprites).points[weekIdx] = {
            rank: null,
            usage_rate: m.usage_rate,
            count: m.count,
          };
        }
        continue;
      }
      rank++;
      seriesOf(deck.fingerprint, deck.pokemon_sprites).points[weekIdx] = {
        rank,
        usage_rate: deck.usage_rate,
        count: deck.count,
      };
    }
  });

  const inRange = (r: number | null) => r != null && r <= limit;
  const bestRank = (s: WeeklyDeckUsageTrendSeriesType) =>
    Math.min(...s.points.map((p) => p.rank ?? Infinity));
  const lastRank = (s: WeeklyDeckUsageTrendSeriesType) =>
    s.points[weekCount - 1]?.rank ?? Infinity;

  const series = [...seriesByFingerprint.values()]
    .filter((s) => s.points.some((p) => inRange(p.rank)))
    .sort((a, b) => {
      const la = inRange(lastRank(a)) ? lastRank(a) : Infinity;
      const lb = inRange(lastRank(b)) ? lastRank(b) : Infinity;
      if (la !== lb) return la - lb;
      return bestRank(a) - bestRank(b);
    });

  return {
    limit,
    weeks: stats.map((s) => ({
      week: s.week_start,
      week_start: s.week_start,
      week_end: s.week_end,
      total_votes: s.total_votes,
    })),
    series,
  };
}
