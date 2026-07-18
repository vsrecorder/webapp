import { NextResponse, NextRequest } from "next/server";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

import { DeckCardDetailType } from "@app/types/deckcard";

async function getDeckCardDetail(code: string): Promise<DeckCardDetailType> {
  return await fetchUpstream<DeckCardDetailType>(
    upstreamUrl`/api/v1beta/deckcards/${code}/detail`,
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

    const detail = await getDeckCardDetail(code);

    return NextResponse.json(detail, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
