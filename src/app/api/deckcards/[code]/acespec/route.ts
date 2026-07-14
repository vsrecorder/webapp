import { NextResponse, NextRequest } from "next/server";

import { fetchUpstream, upstreamErrorResponse } from "@app/utils/upstream";

import { AcespecType } from "@app/types/acespec";

async function getAcespec(code: string): Promise<AcespecType | null> {
  const domain = process.env.VSRECORDER_DOMAIN;

  return await fetchUpstream<AcespecType | null>(
    `https://${domain}/api/v1beta/deckcards/${code}/acespec`,
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

    // 上流が204（該当カードなし）を返した場合は、そのまま「中身なし」として返す
    if (acespec === null) {
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json(acespec, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
