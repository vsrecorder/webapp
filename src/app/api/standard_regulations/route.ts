import { NextResponse } from "next/server";

import { StandardRegulationType } from "@app/types/standard_regulation";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

export async function GET() {
  try {
    const data = await fetchUpstream<StandardRegulationType[]>(
      upstreamUrl`/api/v1beta/standard_regulations`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
      },
    );

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
