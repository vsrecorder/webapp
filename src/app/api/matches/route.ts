import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

import {
  MatchCreateRequestType,
  MatchCreateResponseType,
  MatchGetResponseType,
} from "@app/types/match";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signUpstreamToken(session.user.id);

  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ?? "20";
    const matches = await fetchUpstream<MatchGetResponseType[]>(
      upstreamUrl`/api/v1beta/matches?limit=${limit}`,
      {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
      },
    );

    return NextResponse.json(matches, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signUpstreamToken(session.user.id);

  try {
    const match: MatchCreateRequestType = await request.json();

    const created = await fetchUpstream<MatchCreateResponseType>(
      upstreamUrl`/api/v1beta/matches`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(match),
      },
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
