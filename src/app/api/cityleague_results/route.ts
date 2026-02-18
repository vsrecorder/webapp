import { NextRequest, NextResponse } from "next/server";

import { CityleagueResultGetResponseType } from "@app/types/cityleague_result";

async function getCityleagueResults(
  league_type: number,
): Promise<CityleagueResultGetResponseType> {
  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];

    const res = await fetch(
      `https://${domain}/api/v1beta/cityleague_results?league_type=${league_type}&date=${today}`,
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

async function getCityleagueResultsByTerm(
  league_type: number,
  from_date: Date,
  to_date: Date,
): Promise<CityleagueResultGetResponseType> {
  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const from_date_str = from_date.toISOString().split("T")[0];
    const to_date_str = to_date.toISOString().split("T")[0];

    const res = await fetch(
      `https://${domain}/api/v1beta/cityleague_results?league_type=${league_type}&from_date=${from_date_str}&to_date=${to_date_str}`,
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
  try {
    const { searchParams } = new URL(request.url);
    const league_type = Number(searchParams.get("league_type")) ?? 0;

    if (searchParams.get("from_date") && searchParams.get("to_date")) {
      const from_date = new Date(searchParams.get("from_date") ?? "");
      const to_date = new Date(searchParams.get("to_date") ?? "");

      const ret = await getCityleagueResultsByTerm(league_type, from_date, to_date);

      return NextResponse.json(ret, { status: 200 });
    }

    const ret = await getCityleagueResults(league_type);

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}
