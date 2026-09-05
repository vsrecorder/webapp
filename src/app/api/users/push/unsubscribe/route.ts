import { NextRequest, NextResponse } from "next/server";

import { upstreamUrl } from "@app/utils/upstream";

import { relay } from "../_shared";
import { requireUpstreamToken } from "@app/utils/upstreamToken";

// Web Push の購読解除(B-1)。endpoint で端末を特定して revoke する。
export async function POST(request: NextRequest) {
  const { token, response } = await requireUpstreamToken();
  if (response) return response;

  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (!body || typeof body.endpoint !== "string") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  return relay(token, upstreamUrl`/api/v1beta/users/push_subscriptions`, "DELETE", {
    endpoint: body.endpoint,
  });
}
