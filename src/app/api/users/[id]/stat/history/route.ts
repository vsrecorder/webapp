import { NextResponse, NextRequest } from "next/server";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

import { UserStatHistoryType } from "@app/types/user_stat_history";

async function getUserStatHistory(
  userId: string,
  period: string,
  season: string,
  deckId: string,
  regulationId: string,
  excludeDefaultMatches: string,
): Promise<UserStatHistoryType> {
  const params = new URLSearchParams();
  if (period) params.set("period", period);
  if (season) params.set("season", season);
  if (deckId) params.set("deck_id", deckId);
  if (regulationId) params.set("regulation_id", regulationId);
  // 不戦勝・不戦敗を集計から外すかどうか。未指定(=含める)のときは付けない
  if (excludeDefaultMatches) params.set("exclude_default_matches", excludeDefaultMatches);

  return await fetchUpstream<UserStatHistoryType>(
    upstreamUrl`/api/v1beta/users/${userId}/stats/history?${params}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    },
  );
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
  const regulationId = searchParams.get("regulation_id") ?? "";
  const excludeDefaultMatches = searchParams.get("exclude_default_matches") ?? "";

  try {
    const history = await getUserStatHistory(
      id,
      period,
      season,
      deckId,
      regulationId,
      excludeDefaultMatches,
    );
    return NextResponse.json(history, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
