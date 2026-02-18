import { NextRequest, NextResponse } from "next/server";

import { CityleagueResultType } from "@app/types/cityleague_result";

async function getCityleagueResultByOfficialEventId(
  id: string,
): Promise<CityleagueResultType> {
  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(
      `https://${domain}/api/v1beta/cityleague_results?official_event_id=${id}`,
      {
        cache: "no-store",
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    const ret: CityleagueResultType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const ret = await getCityleagueResultByOfficialEventId(id);

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}
