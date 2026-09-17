import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

import { UserBadgesType } from "@app/types/badge";

async function getUserBadges(
  userId: string,
  season: string,
  token: string,
): Promise<UserBadgesType> {
  const query = new URLSearchParams();
  if (season) query.set("season", season);

  return await fetchUpstream<UserBadgesType>(
    upstreamUrl`/api/v1beta/users/${userId}/badges?${query}`,
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
  // バッジは本人の活動記録そのもので、他人向けの画面は無い。
  // 上流も本人以外を403で弾くが、無駄な往復を避けるため手前で弾く。
  if (session.user.id !== id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const season = searchParams.get("season") ?? "";

  try {
    const badges = await getUserBadges(id, season, signUpstreamToken(session.user.id));
    return NextResponse.json(badges, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
