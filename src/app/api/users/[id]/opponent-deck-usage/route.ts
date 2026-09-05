import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import { OpponentDeckUsageStatType } from "@app/types/opponent_deck_usage_stat";

import { upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

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
    const week = searchParams.get("week") ?? "";
    const yearMonth = searchParams.get("year_month") ?? "";
    const environmentId = searchParams.get("environment_id") ?? "";
    const season = searchParams.get("season") ?? "";
    const standardRegulationId = searchParams.get("standard_regulation_id") ?? "";
    const regulationId = searchParams.get("regulation_id") ?? "";
    const deckId = searchParams.get("deck_id") ?? "";

    const queryParams = new URLSearchParams();
    if (week) queryParams.set("week", week);
    if (yearMonth) queryParams.set("year_month", yearMonth);
    if (environmentId) queryParams.set("environment_id", environmentId);
    if (season) queryParams.set("season", season);
    if (standardRegulationId)
      queryParams.set("standard_regulation_id", standardRegulationId);
    if (regulationId) queryParams.set("regulation_id", regulationId);
    if (deckId) queryParams.set("deck_id", deckId);

    const res = await fetch(
      upstreamUrl`/api/v1beta/users/${id}/opponent_deck_usage?${queryParams}`,
      {
        cache: "no-store",
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      },
    );

    if (!res.ok) {
      const body = await res.json();
      return NextResponse.json(body, { status: res.status });
    }

    const stat: OpponentDeckUsageStatType = await res.json();

    return NextResponse.json(stat, { status: 200 });
  } catch (error) {
    throw error;
  }
}
