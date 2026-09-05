import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { MatchGetResponseType } from "@app/types/match";

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
    const limit = searchParams.get("limit") ?? "10";
    const res = await fetch(
      upstreamUrl`/api/v1beta/users/${id}/matches?limit=${limit}`,
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

    const ret: MatchGetResponseType[] = await res.json();

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}
