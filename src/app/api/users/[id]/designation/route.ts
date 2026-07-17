import { NextResponse, NextRequest } from "next/server";

import { upstreamUrl } from "@app/utils/upstream";

import { UserDesignationType } from "@app/types/designation";

async function getUserDesignation(userId: string, season: string): Promise<UserDesignationType> {
  const query = new URLSearchParams();
  if (season) query.set("season", season);

  const res = await fetch(upstreamUrl`/api/v1beta/users/${userId}/designation?${query}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`failed to fetch user designation: ${res.status}`);
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

  const designation = await getUserDesignation(id, season);
  return NextResponse.json(designation, { status: 200 });
}
