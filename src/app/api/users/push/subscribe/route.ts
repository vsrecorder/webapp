import { NextRequest, NextResponse } from "next/server";

import { upstreamUrl } from "@app/utils/upstream";

import { relay } from "../_shared";
import { requireUpstreamToken } from "@app/utils/upstreamToken";

/*
 * Web Push の購読登録(B-1)。ブラウザの PushSubscription.toJSON() に platform を添えて受け、
 * core-apiserver へそのまま中継する(endpoint で upsert されるため何度呼んでもよい)。
 * 値の検証は上流(validation/push_subscription.go)に一元化する。
 */

type SubscribeRequest = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
  platform?: unknown;
};

export async function POST(request: NextRequest) {
  const { token, response } = await requireUpstreamToken();
  if (response) return response;

  const body = (await request.json().catch(() => null)) as SubscribeRequest | null;
  if (!body || typeof body.endpoint !== "string") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  return relay(token, upstreamUrl`/api/v1beta/users/push_subscriptions`, "POST", {
    endpoint: body.endpoint,
    keys: {
      p256dh: typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "",
      auth: typeof body.keys?.auth === "string" ? body.keys.auth : "",
    },
    platform: typeof body.platform === "string" ? body.platform : "",
  });
}
