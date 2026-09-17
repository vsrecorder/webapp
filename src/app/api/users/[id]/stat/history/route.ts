import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

import { UserStatHistoryType } from "@app/types/user_stat_history";

async function getUserStatHistory(
  userId: string,
  period: string,
  season: string,
  deckId: string,
  regulationId: string,
  excludeDefaultMatches: string,
  token: string,
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
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
    },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  // 戦績の推移は本人の活動記録そのもので、他人向けの画面は無い。
  // 上流も本人以外を403で弾くが、無駄な往復を避けるため手前で弾く。
  if (session.user.id !== id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

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
      signUpstreamToken(session.user.id),
    );
    return NextResponse.json(history, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
