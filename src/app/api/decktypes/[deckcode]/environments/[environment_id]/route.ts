import { NextResponse, NextRequest } from "next/server";

import { fetchUpstream, upstreamErrorResponse } from "@app/utils/upstream";

import { DeckTypeData } from "@app/types/decktype";

// ここだけは他のルートと違い、VSRECORDER_DOMAIN ではなく旧v1 APIを直接叩いているため
// upstreamUrl が使えない。パスに埋める値のエンコードは自前で行う（理由は upstreamUrl のコメント参照）。
async function getDeckType(
  deckcode: string,
  environment_id: string,
): Promise<DeckTypeData[]> {
  return await fetchUpstream<DeckTypeData[]>(
    `https://vsrecorder.mobi/api/v1/decktypes/${encodeURIComponent(deckcode)}` +
      `/environments/${encodeURIComponent(environment_id)}`,
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
