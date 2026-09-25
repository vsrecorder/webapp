import { NextResponse, NextRequest } from "next/server";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

import { addDays, currentWeekValue } from "@app/utils/week";
import {
  buildWeeklyDeckUsageTrend,
  DECK_USAGE_TREND_SELECTABLE_WEEKS,
  normalizeTrendRange,
  trendWeeks,
} from "@app/utils/weeklyDeckUsageTrend";

import { WeeklyDeckUsageStatType } from "@app/types/weekly_deck_usage_stat";

// 対戦環境分析の「使用率順位の推移」を返す公開 proxy。
// 週次デッキ使用率(1体目でまとめた集計)を from〜to の週ぶん並列に取り、
// 順位の推移へ組み立てる。非会員も閲覧できるため auth() は呼ばない。

/*
 * 上流の週次集計は Data Cache に載せる。推移1回で上流を最大12回呼び、上流は1回ごとに
 * 前週ぶんも集計するため、キャッシュ無しでは1リクエストで最大24週ぶんの集計が走る
 * (実測: 12週の推移を同時に10件受けると応答が 0.3秒 → 2.4秒)。集計は利用者ごとに
 * 変わらない共通のデータなので、期間内は上流を週ごとに1回呼ぶだけで済ませる。
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

async function getWeeklyDeckUsage(
  week: string,
  revalidate: number,
): Promise<WeeklyDeckUsageStatType> {
  const query = new URLSearchParams({ week, grouping: "first_sprite" });

  return await fetchUpstream<WeeklyDeckUsageStatType>(
    upstreamUrl`/api/v1beta/deck_meta/weekly_usage?${query}`,
    {
      cache: "force-cache",
      next: { revalidate },
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // 対象期間(週の月曜日、両端を含む)。未指定・不正な値や週数の上限を超える指定は
    // 既定の期間(先週までの6週)にする。週数の上限は上流を呼ぶ回数の上限でもある。
    //
    // 画面で選べる範囲(今週を含む直近 DECK_USAGE_TREND_SELECTABLE_WEEKS 週)より前も受け付けない。
    // 受け付けると、期間をずらしたリクエストを送り続けるだけで Data Cache に当たらない
    // 上流の集計(1回で最大24週ぶん)を何度でも走らせられ、キャッシュの項目も際限なく増える。
    // 月曜0時をまたいで開いたままの画面(選択肢が1週古い)を弾かないよう、1週だけ余裕を持たせる
    const currentWeek = currentWeekValue();
    const range = normalizeTrendRange(
      searchParams.get("from"),
      searchParams.get("to"),
      currentWeek,
      addDays(currentWeek, -7 * DECK_USAGE_TREND_SELECTABLE_WEEKS),
    );

    // 古い週が先頭
    const lastWeek = addDays(currentWeek, -7);
    const stats = await Promise.all(
      trendWeeks(range).map((week) =>
        getWeeklyDeckUsage(
          week,
          week >= lastWeek ? RECENT_REVALIDATE_SECONDS : PAST_REVALIDATE_SECONDS,
        ),
      ),
    );

    return NextResponse.json(buildWeeklyDeckUsageTrend(stats), { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
