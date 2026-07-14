import { NextResponse, NextRequest } from "next/server";

import { fetchUpstream, upstreamErrorResponse } from "@app/utils/upstream";

import { DeckTypeData } from "@app/types/decktype";

async function getDeckType(
  deckcode: string,
  environment_id: string,
): Promise<DeckTypeData[]> {
  //const domain = process.env.VSRECORDER_DOMAIN;

  return await fetchUpstream<DeckTypeData[]>(
    `https://vsrecorder.mobi/api/v1/decktypes/${deckcode}/environments/${environment_id}`,
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
  { params }: { params: Promise<{ deckcode: string; environment_id: string }> },
) {
  try {
    const { deckcode, environment_id } = await params;

    const decktypes = await getDeckType(deckcode, environment_id);

    return NextResponse.json(decktypes, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
