import { NextRequest, NextResponse } from "next/server";

import { OfficialEventResponseType } from "@app/types/official_event";

async function getOfficialEventByDate(
  type_id: string,
  league_type: string,
  date: string,
): Promise<OfficialEventResponseType> {
  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(
      `https://${domain}/api/v1beta/official_events?type_id=${type_id}&league_type=${league_type}&date=${date}`,
      {
        cache: "no-store",
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    const ret: OfficialEventResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type_id = searchParams.get("type_id") ?? "";
    const league_type = searchParams.get("league_type") ?? "";
    const date = searchParams.get("date") ?? "";

    const ret = await getOfficialEventByDate(type_id, league_type, date);

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}
