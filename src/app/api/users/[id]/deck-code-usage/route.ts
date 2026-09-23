import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import { DeckCodeUsageStatType } from "@app/types/deck_usage_stat";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

// デッキの対戦成績をバージョン(デッキコード)ごとに分けて返す。自分の成績だけが対象。
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signUpstreamToken(session.user.id);

  try {
    const { id } = await params;
    // 他人のIDを指定されてもバックエンドが403で弾くが、無駄な往復を避けるため手前で弾く。
    if (session.user.id !== id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const deckId = searchParams.get("deck_id") ?? "";
    // 不戦勝・不戦敗を集計から外すかどうか(未指定なら上流の既定＝含める)
    const excludeDefaultMatches = searchParams.get("exclude_default_matches") ?? "";

    const queryParams = new URLSearchParams();
    if (deckId) queryParams.set("deck_id", deckId);
    if (excludeDefaultMatches)
      queryParams.set("exclude_default_matches", excludeDefaultMatches);

    const stat = await fetchUpstream<DeckCodeUsageStatType>(
      upstreamUrl`/api/v1beta/users/${id}/deck_code_usage?${queryParams}`,
      {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      },
    );

    return NextResponse.json(stat, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
