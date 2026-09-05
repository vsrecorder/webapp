import { NextResponse, NextRequest } from "next/server";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

import { AcespecType } from "@app/types/acespec";

async function getAcespec(code: string): Promise<AcespecType | null> {
  return await fetchUpstream<AcespecType | null>(
    upstreamUrl`/api/v1beta/deckcards/${code}/acespec`,
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

    const acespec = await getAcespec(code);

    // デッキコードの ACE SPEC は変わらないので、ブラウザ側にも1日持たせる(再訪時の呼び出しを減らす)
    const headers = { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" };

    // 上流が204（該当カードなし）を返した場合は、そのまま「中身なし」として返す
    if (acespec === null) {
      return new NextResponse(null, { status: 204, headers });
    }

    return NextResponse.json(acespec, { status: 200, headers });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
