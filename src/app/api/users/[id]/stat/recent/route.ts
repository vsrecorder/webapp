import { NextResponse, NextRequest } from "next/server";

import { RecentMatchStatType } from "@app/types/user_stat_recent";

async function getUserStatRecent(
  userId: string,
  count: string,
  deckId: string,
): Promise<RecentMatchStatType> {
  const domain = process.env.VSRECORDER_DOMAIN;

  const params = new URLSearchParams();
  if (count) params.set("count", count);
  if (deckId) params.set("deck_id", deckId);

  const query = params.toString() ? `?${params.toString()}` : "";

  const res = await fetch(
    `https://${domain}/api/v1beta/users/${userId}/stats/recent${query}`,
    {
      cache: "no-store",
      method: "GET",
      headers: { Accept: "application/json" },
    },
  );

  if (!res.ok) {
    throw new Error(`failed to fetch user stat recent: ${res.status}`);
  }

  return res.json();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const count = searchParams.get("count") ?? "";
  const deckId = searchParams.get("deck_id") ?? "";

  const stat = await getUserStatRecent(id, count, deckId);
  return NextResponse.json(stat, { status: 200 });
}
