import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

import { DeckCodeType } from "@app/types/deck_code";

async function getDeckCodesByDeckId(
  token: string,
  deck_id: string,
): Promise<DeckCodeType[]> {
  return await fetchUpstream<DeckCodeType[]>(
    upstreamUrl`/api/v1beta/decks/${deck_id}/deckcodes`,
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

  const token = signUpstreamToken(session.user.id);

  try {
    const { id } = await params;
    const deck_id = id;

    const deckcodes = await getDeckCodesByDeckId(token, deck_id);

    return NextResponse.json(deckcodes, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
