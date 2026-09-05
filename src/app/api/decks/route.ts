import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

import {
  DeckGetResponseType,
  DeckCreateRequestType,
  DeckCreateResponseType,
} from "@app/types/deck";

async function getDecks(
  token: string,
  archived: boolean,
  cursor: string,
): Promise<DeckGetResponseType> {
  return await fetchUpstream<DeckGetResponseType>(
    upstreamUrl`/api/v1beta/decks?limit=10&archived=${archived}&cursor=${cursor}`,
    {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
    },
  );
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signUpstreamToken(session.user.id);

  try {
    const { searchParams } = new URL(request.url);
    const archivedParam = searchParams.get("archived");
    const archived = archivedParam === "true";
    const cursor = searchParams.get("cursor") ?? "";

    const decks = await getDecks(token, archived, cursor);

    return NextResponse.json(decks, { status: 200 });
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
    const deck: DeckCreateRequestType = await request.json();

    const created = await fetchUpstream<DeckCreateResponseType>(
      upstreamUrl`/api/v1beta/decks`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deck),
      },
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
