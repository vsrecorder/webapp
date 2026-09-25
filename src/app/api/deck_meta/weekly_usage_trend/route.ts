import { NextResponse, NextRequest } from "next/server";

import { upstreamErrorResponse } from "@app/utils/upstream";

import { currentWeekValue } from "@app/utils/week";
import { trendRangeFromQuery } from "@app/utils/weeklyDeckUsageTrend";
import { fetchWeeklyDeckUsageTrend } from "@app/utils/weeklyDeckUsageUpstream";

// 対戦環境分析の「使用率順位の推移」を返す公開 proxy。
// 週次デッキ使用率(1体目でまとめた集計)を from〜to の週ぶん並列に取り、
// 順位の推移へ組み立てる(上流の取得と Data Cache は weeklyDeckUsageUpstream)。
// 非会員も閲覧できるため auth() は呼ばない。
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = trendRangeFromQuery(
      searchParams.get("from"),
      searchParams.get("to"),
      currentWeekValue(),
    );

    return NextResponse.json(await fetchWeeklyDeckUsageTrend(range), { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
