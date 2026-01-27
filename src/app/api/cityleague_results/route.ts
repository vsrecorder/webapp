import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/(default)/auth";

import { CityleagueResultGetResponseType } from "@app/types/cityleague_result";

async function getCityleagueResults(
  league_type: number,
): Promise<CityleagueResultGetResponseType> {
  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(
      `https://${domain}/api/v1beta/cityleague_results?league_type=${league_type}`,
      {
        cache: "no-store",
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    const ret: CityleagueResultGetResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const league_type = Number(searchParams.get("league_type")) ?? 0;

    const ret = await getCityleagueResults(league_type);

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}
