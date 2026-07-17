import { NextRequest, NextResponse } from "next/server";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

import { OfficialEventGetByIdResponseType } from "@app/types/official_event";

async function getOfficialEventById(
  id: string,
): Promise<OfficialEventGetByIdResponseType> {
  return await fetchUpstream<OfficialEventGetByIdResponseType>(
    upstreamUrl`/api/v1beta/official_events/${id}`,
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

    const officialEvent = await getOfficialEventById(id);

    return NextResponse.json(officialEvent, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
