import { addDays, isValidWeekValue } from "@app/utils/week";

import {
  WeeklyDeckUsageItemType,
  WeeklyDeckUsageStatType,
} from "@app/types/weekly_deck_usage_stat";
import {
  WeeklyDeckUsageTrendMembersType,
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

/*
 * 系列の色。30系列を色だけで見分けることはできないため、見分けは両端のスプライトと
 * タップ時の強調が担い、色は「隣り合う線が別物に見える」ための補助にとどめる。
 * 並び(最新週の順位順)に黄金角で色相を振り、隣の順位どうしが近い色にならないようにする。
 * 画面の推移グラフと OGP 画像で同じ色にするため、ここに置く。
 */
export function trendSeriesColor(index: number): string {
  const hue = (index * 137.508 + 12) % 360;
  return `hsl(${hue.toFixed(1)} 72% 52%)`;
}

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
 * サーバ側(推移 API・ページの OGP)で URL の from / to を期間へ正規化する。
 * 未指定・不正な値や週数の上限を超える指定は既定の期間(先週までの6週)にする。
 * 週数の上限は上流を呼ぶ回数の上限でもある。
 *
 * 画面で選べる範囲(今週を含む直近 DECK_USAGE_TREND_SELECTABLE_WEEKS 週)より前も受け付けない。
 * 受け付けると、期間をずらしたリクエストを送り続けるだけで Data Cache に当たらない
 * 上流の集計(1回で最大24週ぶん)を何度でも走らせられ、キャッシュや OGP 画像の項目も
 * 際限なく増える。月曜0時をまたいで開いたままの画面(選択肢が1週古い)を弾かないよう、
 * 1週だけ余裕を持たせる。
 */
export function trendRangeFromQuery(
  from: string | null | undefined,
  to: string | null | undefined,
  currentWeek: string,
): DeckUsageTrendRange {
  return normalizeTrendRange(
    from,
    to,
    currentWeek,
    addDays(currentWeek, -7 * DECK_USAGE_TREND_SELECTABLE_WEEKS),
  );
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

// 推移グラフの系列の指紋(1体目でまとめた集計ではスプライトID1つ)として受け付ける形。
// 内訳 API の入力検証に使う(任意の文字列をキャッシュや上流の探索に通さない)
const TREND_FINGERPRINT_PATTERN = /^[0-9A-Za-z_-]{1,40}$/;

export function isTrendFingerprint(value: string | null | undefined): value is string {
  return value != null && TREND_FINGERPRINT_PATTERN.test(value);
}

/*
 * 推移グラフで選んだ1系列(1体目でまとめた行)の、週ごとの組み合わせの内訳を取り出す。
 * stats は古い週が先頭。順位の数え方は buildWeeklyDeckUsageTrend と同じ
 * (「その他」を除いた個別の行の並び)。「その他」に集約された週も、その内訳から拾う。
 *
 * 内訳は上流が1体目でまとめた行に付けている members(束ねる前の組み合わせ)をそのまま使う。
 * 使用率は全体件数が分母なので、内訳の合計がその週の行の使用率に一致する。
 */
export function buildWeeklyDeckUsageTrendMembers(
  stats: WeeklyDeckUsageStatType[],
  fingerprint: string,
): WeeklyDeckUsageTrendMembersType {
  // 前週比較(previous_*)は内訳の表示に使わないので落とし、応答を軽くする
  const strip = (item: WeeklyDeckUsageItemType): WeeklyDeckUsageItemType => ({
    fingerprint: item.fingerprint,
    count: item.count,
    usage_rate: item.usage_rate,
    wins: item.wins,
    losses: item.losses,
    win_rate: item.win_rate,
    pokemon_sprites: item.pokemon_sprites,
  });

  const weeks = stats.map((stat) => {
    let rank = 0;
    for (const deck of stat.decks ?? []) {
      if (deck.fingerprint === "") {
        const hit = (deck.members ?? []).find((m) => m.fingerprint === fingerprint);
        if (hit) {
          return {
            week: stat.week_start,
            rank: null,
            count: hit.count,
            usage_rate: hit.usage_rate,
            win_rate: hit.win_rate,
            members: (hit.members ?? []).map(strip),
          };
        }
        continue;
      }
      rank++;
      if (deck.fingerprint === fingerprint) {
        return {
          week: stat.week_start,
          rank,
          count: deck.count,
          usage_rate: deck.usage_rate,
          win_rate: deck.win_rate,
          members: (deck.members ?? []).map(strip),
        };
      }
    }
    return {
      week: stat.week_start,
      rank: null,
      count: 0,
      usage_rate: null,
      win_rate: null,
      members: [],
    };
  });

  return { fingerprint, weeks };
}
