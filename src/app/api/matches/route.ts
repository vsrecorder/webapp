import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { readJsonBody } from "@app/utils/requestBody";
import { signUpstreamToken } from "@app/utils/upstreamToken";

import { MatchCreateRequestType, MatchCreateResponseType } from "@app/types/match";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signUpstreamToken(session.user.id);

  try {
    const match = await readJsonBody<MatchCreateRequestType>(request);

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
