import { NextResponse, NextRequest } from "next/server";

import { upstreamUrl } from "@app/utils/upstream";

import { UserStatType } from "@app/types/user_stat";

async function getUserStat(
  userId: string,
  week: string,
  yearMonth: string,
  environmentId: string,
  season: string,
  standardRegulationId: string,
  regulationId: string,
  excludeDefaultMatches: string,
): Promise<UserStatType> {
  const params = new URLSearchParams();
  if (week) params.set("week", week);
  if (yearMonth) params.set("year_month", yearMonth);
  if (environmentId) params.set("environment_id", environmentId);
  if (season) params.set("season", season);
  if (standardRegulationId)
    params.set("standard_regulation_id", standardRegulationId);
  if (regulationId) params.set("regulation_id", regulationId);
  // 不戦勝/不戦敗を集計から外すかどうか。未指定(=含める)のときは付けない
  if (excludeDefaultMatches) params.set("exclude_default_matches", excludeDefaultMatches);

  const res = await fetch(
    upstreamUrl`/api/v1beta/users/${userId}/stats?${params}`,
    {
      cache: "no-store",
      method: "GET",
      headers: { Accept: "application/json" },
    },
  );

  if (!res.ok) {
    throw new Error(`failed to fetch user stat: ${res.status}`);
  }

  return res.json();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const week = searchParams.get("week") ?? "";
  const yearMonth = searchParams.get("year_month") ?? "";
  const environmentId = searchParams.get("environment_id") ?? "";
  const season = searchParams.get("season") ?? "";
  const standardRegulationId = searchParams.get("standard_regulation_id") ?? "";
  const regulationId = searchParams.get("regulation_id") ?? "";
  const excludeDefaultMatches = searchParams.get("exclude_default_matches") ?? "";

  const stat = await getUserStat(
    id,
    week,
    yearMonth,
    environmentId,
    season,
    standardRegulationId,
    regulationId,
    excludeDefaultMatches,
  );
  return NextResponse.json(stat, { status: 200 });
}
