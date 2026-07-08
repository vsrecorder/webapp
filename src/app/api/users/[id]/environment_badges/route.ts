import { NextResponse, NextRequest } from "next/server";

import { UserEnvironmentBadgesResponseType } from "@app/types/environment_badge";

async function getUserEnvironmentBadges(
  userId: string,
): Promise<UserEnvironmentBadgesResponseType> {
  const domain = process.env.VSRECORDER_DOMAIN;

  const res = await fetch(`https://${domain}/api/v1beta/users/${userId}/environment_badges`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`failed to fetch user environment badges: ${res.status}`);
  }

  return res.json();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const badges = await getUserEnvironmentBadges(id);
  return NextResponse.json(badges, { status: 200 });
}
