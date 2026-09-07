import { NextRequest, NextResponse } from "next/server";

import { upstreamErrorResponse } from "@app/utils/upstream";

import { getOfficialEventList } from "@app/utils/officialEventListServer";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type_id = searchParams.get("type_id") ?? "";
    const league_type = searchParams.get("league_type") ?? "";
    const date = searchParams.get("date") ?? "";

    const officialEvents = await getOfficialEventList(type_id, league_type, date);

    return NextResponse.json(officialEvents, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
