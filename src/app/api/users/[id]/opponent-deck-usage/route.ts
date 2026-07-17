import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import { OpponentDeckUsageStatType } from "@app/types/opponent_deck_usage_stat";

import * as jwt from "jsonwebtoken";

import { upstreamUrl } from "@app/utils/upstream";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const jwtSecret: jwt.Secret = process.env.VSRECORDER_JWT_SECRET as string;
  const jwtSignOptions: jwt.SignOptions = {
    algorithm: "HS256",
    expiresIn: "10s",
  };
  const jwtPayload = {
    iss: "vsrecorder-webapp",
    uid: session.user.id,
  };
  const token = jwt.sign(jwtPayload, jwtSecret, jwtSignOptions);

  try {
    const { id } = await params;
    // 他人のIDを指定されてもバックエンドが403で弾くが、無駄な往復を避けるため手前で弾く。
    if (session.user.id !== id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const yearMonth = searchParams.get("year_month") ?? "";
    const environmentId = searchParams.get("environment_id") ?? "";
    const season = searchParams.get("season") ?? "";
    const regulationId = searchParams.get("regulation_id") ?? "";
    const deckId = searchParams.get("deck_id") ?? "";

    const queryParams = new URLSearchParams();
    if (yearMonth) queryParams.set("year_month", yearMonth);
    if (environmentId) queryParams.set("environment_id", environmentId);
    if (season) queryParams.set("season", season);
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
