import { NextResponse, NextRequest } from "next/server";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

import { UserBadgesType } from "@app/types/badge";

async function getUserBadges(userId: string, season: string): Promise<UserBadgesType> {
  const query = new URLSearchParams();
  if (season) query.set("season", season);

  return await fetchUpstream<UserBadgesType>(
    upstreamUrl`/api/v1beta/users/${userId}/badges?${query}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const season = searchParams.get("season") ?? "";

  try {
    const badges = await getUserBadges(id, season);
    return NextResponse.json(badges, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
