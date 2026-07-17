import { NextResponse, NextRequest } from "next/server";

import { upstreamUrl } from "@app/utils/upstream";

import { UserStatHistoryType } from "@app/types/user_stat_history";

async function getUserStatHistory(
  userId: string,
  period: string,
  season: string,
  deckId: string,
): Promise<UserStatHistoryType> {
  const params = new URLSearchParams();
  if (period) params.set("period", period);
  if (season) params.set("season", season);
  if (deckId) params.set("deck_id", deckId);

  const res = await fetch(
    upstreamUrl`/api/v1beta/users/${userId}/stats/history?${params}`,
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
  const deckId = searchParams.get("deck_id") ?? "";

  const history = await getUserStatHistory(id, period, season, deckId);
  return NextResponse.json(history, { status: 200 });
}
