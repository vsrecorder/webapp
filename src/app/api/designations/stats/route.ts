import { NextResponse, NextRequest } from "next/server";

import { upstreamUrl } from "@app/utils/upstream";

import { DesignationRankStatsType } from "@app/types/designation";

async function getDesignationRankStats(season: string): Promise<DesignationRankStatsType> {
  const query = new URLSearchParams();
  if (season) query.set("season", season);

  const res = await fetch(upstreamUrl`/api/v1beta/designations/stats?${query}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`failed to fetch designation rank stats: ${res.status}`);
  }

  return res.json();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const season = searchParams.get("season") ?? "";

  const stats = await getDesignationRankStats(season);
  return NextResponse.json(stats, { status: 200 });
}
