import { NextResponse, NextRequest } from "next/server";

import { upstreamErrorResponse } from "@app/utils/upstream";

import { currentWeekValue } from "@app/utils/week";
import { isTrendFingerprint, trendRangeFromQuery } from "@app/utils/weeklyDeckUsageTrend";
import { fetchWeeklyDeckUsageTrendMembers } from "@app/utils/weeklyDeckUsageUpstream";

// 使用率順位の推移で選んだ1系列の、週ごとの組み合わせの内訳を返す公開 proxy。
// 推移グラフで線やポケモンを選んだときだけ呼ぶ(推移の応答に全系列の内訳を含めると
// 数倍に膨らみ、選ばない人にも負担になるため)。上流は推移と同じ Data Cache から読む。
// 非会員も閲覧できるため auth() は呼ばない。
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fingerprint = searchParams.get("fingerprint");
    if (!isTrendFingerprint(fingerprint)) {
      return NextResponse.json({ error: "invalid fingerprint" }, { status: 400 });
    }

    const range = trendRangeFromQuery(
      searchParams.get("from"),
      searchParams.get("to"),
      currentWeekValue(),
    );

    return NextResponse.json(await fetchWeeklyDeckUsageTrendMembers(range, fingerprint), {
      status: 200,
    });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
