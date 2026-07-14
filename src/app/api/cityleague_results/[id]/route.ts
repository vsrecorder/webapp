import { NextRequest, NextResponse } from "next/server";

import { fetchUpstream, upstreamErrorResponse } from "@app/utils/upstream";

import { CityleagueResultType } from "@app/types/cityleague_result";

async function getCityleagueResultByOfficialEventId(
  id: string,
): Promise<CityleagueResultType> {
  const domain = process.env.VSRECORDER_DOMAIN;

  return await fetchUpstream<CityleagueResultType>(
    `https://${domain}/api/v1beta/cityleague_results?official_event_id=${id}`,
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
