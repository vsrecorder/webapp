import { NextResponse, NextRequest } from "next/server";

import { fetchUpstream, upstreamErrorResponse } from "@app/utils/upstream";

import { DeckCardSummaryType } from "@app/types/deckcard";

async function getDeckCardSummary(code: string): Promise<DeckCardSummaryType> {
  const domain = process.env.VSRECORDER_DOMAIN;

  return await fetchUpstream<DeckCardSummaryType>(
    `https://${domain}/api/v1beta/deckcards/${code}/summary`,
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
