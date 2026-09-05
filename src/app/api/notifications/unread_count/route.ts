import { NextResponse } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

import { UnreadCountResponseType } from "@app/types/notification";

async function getUnreadCount(token: string): Promise<UnreadCountResponseType> {
  return await fetchUpstream<UnreadCountResponseType>(
    upstreamUrl`/api/v1beta/notifications/unread_count`,
    {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
    },
  );
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signUpstreamToken(session.user.id);

  try {
    const unreadCount = await getUnreadCount(token);

    return NextResponse.json(unreadCount, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
