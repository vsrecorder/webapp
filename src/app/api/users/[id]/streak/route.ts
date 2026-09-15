import { NextResponse, NextRequest } from "next/server";

import { UserStreakType } from "@app/types/streak";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

async function getUserStreak(userId: string): Promise<UserStreakType> {
  return await fetchUpstream<UserStreakType>(
    upstreamUrl`/api/v1beta/users/${userId}/streak`,
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
    const streak = await getUserStreak(id);
    return NextResponse.json(streak, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
