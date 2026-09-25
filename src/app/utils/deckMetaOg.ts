import { todayJSTDateString } from "@app/utils/date";
import {
  renderDeckMetaRankingOgImage,
  renderDeckMetaTrendOgImage,
} from "@app/utils/ogImage";
import { ogImageUrlFor } from "@app/utils/ogStorage";
import { getSpriteBySlot } from "@app/utils/spriteSlot";
import { sundayOfWeekValue, weekRangeLabel } from "@app/utils/week";
import { DeckUsageTrendRange, trendSeriesColor } from "@app/utils/weeklyDeckUsageTrend";
import {
  fetchWeeklyDeckUsage,
  fetchWeeklyDeckUsageTrend,
  isRecentWeek,
} from "@app/utils/weeklyDeckUsageUpstream";

import { WeeklyDeckUsageGroupingType } from "@app/types/weekly_deck_usage_stat";

/*
 * 対戦環境分析ページ(/deck_meta)の OGP 画像。
 *
 * 画像は CDN に不変として置く(ogStorage)。使用率は週ごとに変わり、直近の週(今週・先週)は
 * 記録が後から足されて日ごとにも動くため、キーに「対象の週」と「日付」を入れて別の画像にする。
 * 集計が確定した過去の週は日付の代わりに final を入れ、1枚だけ作る。
 * 対象の週・期間は呼び出し側で検証済みの値に限ること(URL の値をそのままキーにすると、
 * 画像を際限なく作らせられる)。
 */

// この画像のレイアウトの版。描き方を変えたら上げる(ogStorage の版は全ページ共通なので別に持つ)
const OG_LAYOUT_VERSION = "1";

// ランキングの画像に載せる件数と、推移の画像で線を引く順位の範囲
const RANKING_OG_DECKS = 5;
// (上位10位までにすると1行が狭く、右端のスプライトが小さくなりすぎる)
const TREND_OG_LIMIT = 8;

const GROUPING_LABELS: Record<WeeklyDeckUsageGroupingType, string> = {
  first_sprite: "1体目でまとめた集計",
  exact: "組み合わせ別の集計",
};

// 直近の週は日付、確定した週は final
function freshnessKey(week: string): string {
  return isRecentWeek(week) ? todayJSTDateString() : "final";
}

// "2026-09-14" → "9/14"
function shortDate(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}/${d}`;
}

// 使用率ランキング(週・集計単位)の画像を描く
export async function renderDeckMetaRankingImage(
  week: string,
  grouping: WeeklyDeckUsageGroupingType,
): Promise<Buffer> {
  const stat = await fetchWeeklyDeckUsage(week, grouping);
  // 「その他」(指紋が空)は順位を持たないので除く。並びはランキング画面と同じ(サーバで整列済み)
  const decks = (stat.decks ?? [])
    .filter((deck) => deck.fingerprint !== "")
    .slice(0, RANKING_OG_DECKS)
    .map((deck) => ({
      spriteIds:
        grouping === "first_sprite"
          ? [getSpriteBySlot(deck.pokemon_sprites, 1)?.id]
          : [
              getSpriteBySlot(deck.pokemon_sprites, 1)?.id,
              getSpriteBySlot(deck.pokemon_sprites, 2)?.id,
            ],
      usageRate: deck.usage_rate,
    }));

  return renderDeckMetaRankingOgImage({
    weekLabel: weekRangeLabel(week),
    groupingLabel: GROUPING_LABELS[grouping],
    decks,
  });
}

// 使用率ランキングの画像の URL(ページの generateMetadata 用。無ければ裏で用意させる)
export function deckMetaRankingOgImageUrl(
  week: string,
  grouping: WeeklyDeckUsageGroupingType,
): string | null {
  const key = `deck_meta/ranking-${week}-${grouping}-${freshnessKey(week)}-l${OG_LAYOUT_VERSION}`;
  return ogImageUrlFor(key, () => renderDeckMetaRankingImage(week, grouping));
}

// 使用率順位の推移(期間)の画像を描く
export async function renderDeckMetaTrendImage(
  range: DeckUsageTrendRange,
): Promise<Buffer> {
  const trend = await fetchWeeklyDeckUsageTrend(range);
  const last = trend.weeks.length - 1;

  // 最新週の上位だけを描く。色は画面の推移グラフと同じになるよう、全系列の並びでの位置から決める
  const series = trend.series
    .map((s, i) => ({
      spriteId: getSpriteBySlot(s.pokemon_sprites, 1)?.id,
      color: trendSeriesColor(i),
      ranks: s.points.map((p) => p.rank),
    }))
    .filter((s) => {
      const r = s.ranks[last];
      return r != null && r <= TREND_OG_LIMIT;
    });

  return renderDeckMetaTrendOgImage({
    rangeLabel: `${shortDate(range.from)}〜${shortDate(sundayOfWeekValue(range.to))}（${trend.weeks.length}週）`,
    weekLabels: trend.weeks.map((w) => shortDate(w.week)),
    limit: TREND_OG_LIMIT,
    series,
  });
}

// 使用率順位の推移の画像の URL(ページの generateMetadata 用。無ければ裏で用意させる)
export function deckMetaTrendOgImageUrl(range: DeckUsageTrendRange): string | null {
  const key = `deck_meta/trend-${range.from}-${range.to}-${freshnessKey(range.to)}-l${OG_LAYOUT_VERSION}`;
  return ogImageUrlFor(key, () => renderDeckMetaTrendImage(range));
}
