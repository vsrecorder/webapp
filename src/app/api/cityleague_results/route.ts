import { NextRequest, NextResponse } from "next/server";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

import { CityleagueResultGetResponseType } from "@app/types/cityleague_result";

async function getCityleagueResults(
  league_type: number,
): Promise<CityleagueResultGetResponseType> {
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];

  return await fetchUpstream<CityleagueResultGetResponseType>(
    upstreamUrl`/api/v1beta/cityleague_results?league_type=${league_type}&date=${today}`,
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
  const from_date_str = from_date.toISOString().split("T")[0];
  const to_date_str = to_date.toISOString().split("T")[0];

  return await fetchUpstream<CityleagueResultGetResponseType>(
    upstreamUrl`/api/v1beta/cityleague_results?league_type=${league_type}&from_date=${from_date_str}&to_date=${to_date_str}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );
}

// "YYYY-MM-DD" として読める日付だけ通す。Date に不正な文字列を渡すと Invalid Date になり、
// toISOString() が RangeError を投げて 500 になっていた(誰でも起こせる)。
function parseDateParam(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 未指定は 0(絞り込みなし)。数値でない値は NaN のまま上流へ渡さず 400 にする
    const leagueTypeParam = searchParams.get("league_type") ?? "";
    const league_type = leagueTypeParam === "" ? 0 : Number(leagueTypeParam);
    if (!Number.isInteger(league_type) || league_type < 0) {
      return NextResponse.json(
        { error: "league_type must be a non-negative integer" },
        { status: 400 },
      );
    }

    const fromDateParam = searchParams.get("from_date");
    const toDateParam = searchParams.get("to_date");

    if (fromDateParam && toDateParam) {
      const from_date = parseDateParam(fromDateParam);
      const to_date = parseDateParam(toDateParam);
      if (!from_date || !to_date) {
        return NextResponse.json(
          { error: "from_date and to_date must be YYYY-MM-DD" },
          { status: 400 },
        );
      }

      const results = await getCityleagueResultsByTerm(league_type, from_date, to_date);

      return NextResponse.json(results, { status: 200 });
    }

    const results = await getCityleagueResults(league_type);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
