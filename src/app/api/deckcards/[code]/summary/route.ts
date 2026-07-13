import { NextResponse, NextRequest } from "next/server";

import { DeckCardSummaryType } from "@app/types/deckcard";

async function getDeckCardSummary(code: string): Promise<DeckCardSummaryType> {
  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(`https://${domain}/api/v1beta/deckcards/${code}/summary`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const ret: DeckCardSummaryType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    const ret = await getDeckCardSummary(code);

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}
