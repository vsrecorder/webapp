import { NextResponse, NextRequest } from "next/server";

import { UserStatHistoryType } from "@app/types/user_stat_history";

async function getUserStatHistory(
  userId: string,
  period: string,
  season: string,
): Promise<UserStatHistoryType> {
  const domain = process.env.VSRECORDER_DOMAIN;

  const params = new URLSearchParams();
  if (period) params.set("period", period);
  if (season) params.set("season", season);

  const query = params.toString() ? `?${params.toString()}` : "";

  const res = await fetch(
    `https://${domain}/api/v1beta/users/${userId}/stats/history${query}`,
    {
      cache: "no-store",
      method: "GET",
      headers: { Accept: "application/json" },
    },
  );

  if (!res.ok) {
    throw new Error(`failed to fetch user stat history: ${res.status}`);
  }

  return res.json();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "";
  const season = searchParams.get("season") ?? "";

  const history = await getUserStatHistory(id, period, season);
  return NextResponse.json(history, { status: 200 });
}
