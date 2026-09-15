import { NextResponse, NextRequest } from "next/server";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

import { UserDesignationType } from "@app/types/designation";

async function getUserDesignation(userId: string, season: string): Promise<UserDesignationType> {
  const query = new URLSearchParams();
  if (season) query.set("season", season);

  return await fetchUpstream<UserDesignationType>(
    upstreamUrl`/api/v1beta/users/${userId}/designation?${query}`,
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
    const designation = await getUserDesignation(id, season);
    return NextResponse.json(designation, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
