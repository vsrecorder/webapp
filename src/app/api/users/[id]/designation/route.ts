import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

import { UserDesignationType } from "@app/types/designation";

async function getUserDesignation(
  userId: string,
  season: string,
  token: string,
): Promise<UserDesignationType> {
  const query = new URLSearchParams();
  if (season) query.set("season", season);

  return await fetchUpstream<UserDesignationType>(
    upstreamUrl`/api/v1beta/users/${userId}/designation?${query}`,
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
  // 称号の進捗は本人の活動記録そのもので、他人向けの画面は無い
  // (公開デッキに載る称号は deck_code_posts の応答が持つ)。
  // 上流も本人以外を403で弾くが、無駄な往復を避けるため手前で弾く。
  if (session.user.id !== id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const season = searchParams.get("season") ?? "";

  try {
    const designation = await getUserDesignation(
      id,
      season,
      signUpstreamToken(session.user.id),
    );
    return NextResponse.json(designation, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
