import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

async function markNotificationAsRead(token: string, id: string): Promise<Response> {
  return fetch(upstreamUrl`/api/v1beta/notifications/${id}/read`, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signUpstreamToken(session.user.id);

  const { id } = await params;

  // 既読化はcore-apiserver側が204 No Contentで返すためJSONボディはパースしない
  const res = await markNotificationAsRead(token, id);

  return new NextResponse(null, { status: res.status });
}
