import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import { UserStreakType } from "@app/types/streak";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

async function getUserStreak(userId: string, token: string): Promise<UserStreakType> {
  return await fetchUpstream<UserStreakType>(
    upstreamUrl`/api/v1beta/users/${userId}/streak`,
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  // 連続記録は本人の活動記録そのもので、他人向けの画面は無い。
  // 上流も本人以外を403で弾くが、無駄な往復を避けるため手前で弾く。
  if (session.user.id !== id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const streak = await getUserStreak(id, signUpstreamToken(session.user.id));
    return NextResponse.json(streak, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
