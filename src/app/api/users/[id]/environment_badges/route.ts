import { NextResponse, NextRequest } from "next/server";

import { UserEnvironmentBadgesResponseType } from "@app/types/environment_badge";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

async function getUserEnvironmentBadges(
  userId: string,
): Promise<UserEnvironmentBadgesResponseType> {
  return await fetchUpstream<UserEnvironmentBadgesResponseType>(
    upstreamUrl`/api/v1beta/users/${userId}/environment_badges`,
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

  try {
    const badges = await getUserEnvironmentBadges(id);
    return NextResponse.json(badges, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
