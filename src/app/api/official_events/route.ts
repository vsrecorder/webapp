import { NextRequest, NextResponse } from "next/server";

import { fetchUpstream, upstreamErrorResponse } from "@app/utils/upstream";

import { OfficialEventResponseType } from "@app/types/official_event";

async function getOfficialEventByDate(
  type_id: string,
  league_type: string,
  date: string,
): Promise<OfficialEventResponseType> {
  const domain = process.env.VSRECORDER_DOMAIN;

  return await fetchUpstream<OfficialEventResponseType>(
    `https://${domain}/api/v1beta/official_events?type_id=${type_id}&league_type=${league_type}&date=${date}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type_id = searchParams.get("type_id") ?? "";
    const league_type = searchParams.get("league_type") ?? "";
    const date = searchParams.get("date") ?? "";

    const officialEvents = await getOfficialEventByDate(type_id, league_type, date);

    return NextResponse.json(officialEvents, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
