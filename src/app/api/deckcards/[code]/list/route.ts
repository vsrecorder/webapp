import { NextResponse, NextRequest } from "next/server";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

import { DeckCardType } from "@app/types/deckcard";

async function getDeckCardList(code: string): Promise<DeckCardType[]> {
  return await fetchUpstream<DeckCardType[]>(
    upstreamUrl`/api/v1beta/deckcards/${code}/list`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    const cards = await getDeckCardList(code);

    return NextResponse.json(cards, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
