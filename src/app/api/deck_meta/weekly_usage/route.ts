import { NextResponse, NextRequest } from "next/server";

import { fetchUpstream, upstreamErrorResponse } from "@app/utils/upstream";

import { WeeklyDeckUsageStatType } from "@app/types/weekly_deck_usage_stat";

// プラットフォーム全体の週次デッキ使用率を取得する公開 proxy。
// 非会員も閲覧できる環境レポートのため、auth() は呼ばず Authorization ヘッダなしで core-api を叩く。
async function getWeeklyDeckUsage(week: string): Promise<WeeklyDeckUsageStatType> {
  const domain = process.env.VSRECORDER_DOMAIN;

  const query = week ? `?week=${encodeURIComponent(week)}` : "";

  return await fetchUpstream<WeeklyDeckUsageStatType>(
    `https://${domain}/api/v1beta/deck_meta/weekly_usage${query}`,
    {
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
    const week = searchParams.get("week") ?? "";

    const usage = await getWeeklyDeckUsage(week);

    return NextResponse.json(usage, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
