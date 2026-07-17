import { NextResponse, NextRequest } from "next/server";

import { upstreamUrl } from "@app/utils/upstream";

import { UserBadgesType } from "@app/types/badge";

async function getUserBadges(userId: string, season: string): Promise<UserBadgesType> {
  const query = new URLSearchParams();
  if (season) query.set("season", season);

  const res = await fetch(upstreamUrl`/api/v1beta/users/${userId}/badges?${query}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`failed to fetch user badges: ${res.status}`);
  }

  return res.json();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const season = searchParams.get("season") ?? "";

  const badges = await getUserBadges(id, season);
  return NextResponse.json(badges, { status: 200 });
}
