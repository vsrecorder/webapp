import { NextResponse, NextRequest } from "next/server";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

import { DeckCardSummaryType } from "@app/types/deckcard";

async function getDeckCardSummary(code: string): Promise<DeckCardSummaryType> {
  return await fetchUpstream<DeckCardSummaryType>(
    upstreamUrl`/api/v1beta/deckcards/${code}/summary`,
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

    const summary = await getDeckCardSummary(code);

    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
