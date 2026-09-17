import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

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
  token: string,
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

  return await fetchUpstream<UserStatType>(
    upstreamUrl`/api/v1beta/users/${userId}/stats?${params}`,
    {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
    },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  // 戦績は本人の活動記録そのもので、他人向けの画面は無い。
  // 上流も本人以外を403で弾くが、無駄な往復を避けるため手前で弾く。
  if (session.user.id !== id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const week = searchParams.get("week") ?? "";
  const yearMonth = searchParams.get("year_month") ?? "";
  const environmentId = searchParams.get("environment_id") ?? "";
  const season = searchParams.get("season") ?? "";
  const standardRegulationId = searchParams.get("standard_regulation_id") ?? "";
  const regulationId = searchParams.get("regulation_id") ?? "";
  const excludeDefaultMatches = searchParams.get("exclude_default_matches") ?? "";

  try {
    const stat = await getUserStat(
      id,
      week,
      yearMonth,
      environmentId,
      season,
      standardRegulationId,
      regulationId,
      excludeDefaultMatches,
      signUpstreamToken(session.user.id),
    );
    return NextResponse.json(stat, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
