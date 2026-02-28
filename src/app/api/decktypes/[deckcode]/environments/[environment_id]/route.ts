import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/(default)/auth";

import { DeckTypeData } from "@app/types/decktype";

async function getDeckType(
  deckcode: string,
  environment_id: string,
): Promise<DeckTypeData[]> {
  try {
    //const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(
      `https://vsrecorder.mobi/api/v1/decktypes/${deckcode}/environments/${environment_id}`,
      {
        cache: "no-store",
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    const ret: DeckTypeData[] = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deckcode: string; environment_id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { deckcode, environment_id } = await params;
    const ret = await getDeckType(deckcode, environment_id);

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}
