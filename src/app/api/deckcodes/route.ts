import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

import {
  DeckCodeCreateRequestType,
  DeckCodeCreateResponseType,
} from "@app/types/deck_code";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signUpstreamToken(session.user.id);

  try {
    const deckcode: DeckCodeCreateRequestType = await request.json();

    const created = await fetchUpstream<DeckCodeCreateResponseType>(
      upstreamUrl`/api/v1beta/deckcodes`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deckcode),
      },
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
