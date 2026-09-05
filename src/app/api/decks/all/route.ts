import { NextResponse } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

import { DeckGetAllType } from "@app/types/deck";

async function getAllDecks(token: string): Promise<DeckGetAllType> {
  return await fetchUpstream<DeckGetAllType>(upstreamUrl`/api/v1beta/decks/all`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
    },
  });
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signUpstreamToken(session.user.id);

  try {
    const decks = await getAllDecks(token);

    return NextResponse.json(decks, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
