import { NextResponse, NextRequest } from "next/server";

import { DeckCardType } from "@app/types/deckcard";

async function getDeckCardList(code: string): Promise<DeckCardType[]> {
  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(`https://${domain}/api/v1beta/deckcards/${code}/list`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const ret: DeckCardType[] = await res.json();

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

    const ret = await getDeckCardList(code);

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}
