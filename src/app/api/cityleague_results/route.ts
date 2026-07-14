import { NextRequest, NextResponse } from "next/server";

import { fetchUpstream, upstreamErrorResponse } from "@app/utils/upstream";

import { CityleagueResultGetResponseType } from "@app/types/cityleague_result";

async function getCityleagueResults(
  league_type: number,
): Promise<CityleagueResultGetResponseType> {
  const domain = process.env.VSRECORDER_DOMAIN;

  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];

  return await fetchUpstream<CityleagueResultGetResponseType>(
    `https://${domain}/api/v1beta/cityleague_results?league_type=${league_type}&date=${today}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );
}

async function getCityleagueResultsByTerm(
  league_type: number,
  from_date: Date,
  to_date: Date,
): Promise<CityleagueResultGetResponseType> {
  const domain = process.env.VSRECORDER_DOMAIN;

  const from_date_str = from_date.toISOString().split("T")[0];
  const to_date_str = to_date.toISOString().split("T")[0];

  return await fetchUpstream<CityleagueResultGetResponseType>(
    `https://${domain}/api/v1beta/cityleague_results?league_type=${league_type}&from_date=${from_date_str}&to_date=${to_date_str}`,
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
    const league_type = Number(searchParams.get("league_type")) ?? 0;

    if (searchParams.get("from_date") && searchParams.get("to_date")) {
      const from_date = new Date(searchParams.get("from_date") ?? "");
      const to_date = new Date(searchParams.get("to_date") ?? "");

      const results = await getCityleagueResultsByTerm(league_type, from_date, to_date);

      return NextResponse.json(results, { status: 200 });
    }

    const results = await getCityleagueResults(league_type);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
