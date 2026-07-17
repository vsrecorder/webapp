import { NextResponse, NextRequest } from "next/server";

import { upstreamUrl } from "@app/utils/upstream";

import { UserStatType } from "@app/types/user_stat";

async function getUserStat(
  userId: string,
  yearMonth: string,
  environmentId: string,
  season: string,
  regulationId: string,
): Promise<UserStatType> {
  const params = new URLSearchParams();
  if (yearMonth) params.set("year_month", yearMonth);
  if (environmentId) params.set("environment_id", environmentId);
  if (season) params.set("season", season);
  if (regulationId) params.set("regulation_id", regulationId);

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
  const yearMonth = searchParams.get("year_month") ?? "";
  const environmentId = searchParams.get("environment_id") ?? "";
  const season = searchParams.get("season") ?? "";
  const regulationId = searchParams.get("regulation_id") ?? "";

  const stat = await getUserStat(id, yearMonth, environmentId, season, regulationId);
  return NextResponse.json(stat, { status: 200 });
}
