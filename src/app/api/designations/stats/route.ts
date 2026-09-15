import { NextResponse, NextRequest } from "next/server";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

import { DesignationRankStatsType } from "@app/types/designation";

async function getDesignationRankStats(season: string): Promise<DesignationRankStatsType> {
  const query = new URLSearchParams();
  if (season) query.set("season", season);

  return await fetchUpstream<DesignationRankStatsType>(
    upstreamUrl`/api/v1beta/designations/stats?${query}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    },
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const season = searchParams.get("season") ?? "";

  try {
    const stats = await getDesignationRankStats(season);
    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
