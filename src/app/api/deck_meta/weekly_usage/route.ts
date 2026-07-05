import { NextResponse, NextRequest } from "next/server";

import { WeeklyDeckUsageStatType } from "@app/types/weekly_deck_usage_stat";

// プラットフォーム全体の週次デッキ使用率を取得する公開 proxy。
// 非会員も閲覧できる環境レポートのため、auth() は呼ばず Authorization ヘッダなしで core-api を叩く。
async function getWeeklyDeckUsage(week: string): Promise<WeeklyDeckUsageStatType> {
  const domain = process.env.VSRECORDER_DOMAIN;

  const query = week ? `?week=${encodeURIComponent(week)}` : "";

  const res = await fetch(`https://${domain}/api/v1beta/deck_meta/weekly_usage${query}`, {
    cache: "no-store",
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const ret: WeeklyDeckUsageStatType = await res.json();

  return ret;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get("week") ?? "";

    const ret = await getWeeklyDeckUsage(week);

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}
