import { fetchUpstream, upstreamUrl } from "@app/utils/upstream";
import { addDays, currentWeekValue } from "@app/utils/week";
import {
  buildWeeklyDeckUsageTrend,
  buildWeeklyDeckUsageTrendMembers,
  DeckUsageTrendRange,
  trendWeeks,
} from "@app/utils/weeklyDeckUsageTrend";

import {
  WeeklyDeckUsageGroupingType,
  WeeklyDeckUsageStatType,
} from "@app/types/weekly_deck_usage_stat";
import {
  WeeklyDeckUsageTrendMembersType,
  WeeklyDeckUsageTrendType,
} from "@app/types/weekly_deck_usage_trend";

/*
 * サーバ側(BFF・OGP画像)から週次デッキ使用率を取る。使用率順位の推移 API と、
 * 対戦環境分析ページの OGP 画像で共有する。
 *
 * 上流の週次集計は Data Cache に載せる。推移1回で上流を最大12回呼び、上流は1回ごとに
 * 前週ぶんも集計するため、キャッシュ無しでは1リクエストで最大24週ぶんの集計が走る
 * (実測: 12週の推移を同時に10件受けると応答が 0.3秒 → 2.4秒)。集計は利用者ごとに
 * 変わらない共通のデータなので、期間内は上流を週ごとに1回呼ぶだけで済ませる。
 * OGP 画像も同じ URL で取るので、推移を見た直後なら上流を呼ばずに描ける。
 *
 * 期間は週の新しさで分ける。今週・先週は記録が後から足されやすい(週末の大会を翌週に
 * 記録する)ため短く、それより前の週はほとんど動かないため長くする。
 * ランキングのタブは毎回上流を呼ぶので、直近の週は最大で RECENT ぶん数字がずれうる。
 *
 * cache: "force-cache" を明示するのは、no-store と revalidate を併用すると
 * 両方無視されるため(Next.js の fetch の仕様。api/regulations と同じ)。
 */
const RECENT_REVALIDATE_SECONDS = 300;
const PAST_REVALIDATE_SECONDS = 3600;

// 数字がまだ動く週(今週・先週)か。それより前の週は集計が確定しているとみなす
export function isRecentWeek(week: string, currentWeek = currentWeekValue()): boolean {
  return week >= addDays(currentWeek, -7);
}

export async function fetchWeeklyDeckUsage(
  week: string,
  grouping: WeeklyDeckUsageGroupingType,
): Promise<WeeklyDeckUsageStatType> {
  const query = new URLSearchParams({ week, grouping });

  return await fetchUpstream<WeeklyDeckUsageStatType>(
    upstreamUrl`/api/v1beta/deck_meta/weekly_usage?${query}`,
    {
      cache: "force-cache",
      next: {
        revalidate: isRecentWeek(week) ? RECENT_REVALIDATE_SECONDS : PAST_REVALIDATE_SECONDS,
      },
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );
}

// 期間の推移(1体目でまとめた集計)を組み立てる。範囲の検証は呼び出し側で済ませること
export async function fetchWeeklyDeckUsageTrend(
  range: DeckUsageTrendRange,
): Promise<WeeklyDeckUsageTrendType> {
  // 古い週が先頭
  const stats = await Promise.all(
    trendWeeks(range).map((week) => fetchWeeklyDeckUsage(week, "first_sprite")),
  );
  return buildWeeklyDeckUsageTrend(stats);
}

// 推移グラフで選んだ1系列の、週ごとの組み合わせの内訳。推移と同じ URL で取るので、
// 推移を表示した直後なら上流を呼ばずに Data Cache から組み立てられる
export async function fetchWeeklyDeckUsageTrendMembers(
  range: DeckUsageTrendRange,
  fingerprint: string,
): Promise<WeeklyDeckUsageTrendMembersType> {
  const stats = await Promise.all(
    trendWeeks(range).map((week) => fetchWeeklyDeckUsage(week, "first_sprite")),
  );
  return buildWeeklyDeckUsageTrendMembers(stats, fingerprint);
}
