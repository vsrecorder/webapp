import { NextResponse, NextRequest } from "next/server";

import { UserStreakType } from "@app/types/streak";

import { upstreamUrl } from "@app/utils/upstream";

async function getUserStreak(userId: string): Promise<UserStreakType> {
  const res = await fetch(upstreamUrl`/api/v1beta/users/${userId}/streak`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`failed to fetch user streak: ${res.status}`);
  }

  return res.json();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const streak = await getUserStreak(id);
  return NextResponse.json(streak, { status: 200 });
}
