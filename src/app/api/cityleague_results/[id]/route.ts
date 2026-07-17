import { NextRequest, NextResponse } from "next/server";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

import { CityleagueResultType } from "@app/types/cityleague_result";

async function getCityleagueResultByOfficialEventId(
  id: string,
): Promise<CityleagueResultType> {
  return await fetchUpstream<CityleagueResultType>(
    upstreamUrl`/api/v1beta/cityleague_results?official_event_id=${id}`,
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
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const result = await getCityleagueResultByOfficialEventId(id);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
