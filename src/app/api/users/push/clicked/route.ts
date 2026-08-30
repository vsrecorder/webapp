import { NextRequest, NextResponse } from "next/server";

import { upstreamUrl } from "@app/utils/upstream";

import { isValidDeliveryId, relay, signUpstreamToken } from "../_shared";

// 通知がタップされ、リンク先が開かれたことの記録(B-1)。画面側(PushClickTracker)から呼ばれる。
export async function POST(request: NextRequest) {
  const { token, response } = await signUpstreamToken();
  if (response) return response;

  const body = (await request.json().catch(() => null)) as { deliveryId?: unknown } | null;
  if (!body || !isValidDeliveryId(body.deliveryId)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  return relay(
    token,
    upstreamUrl`/api/v1beta/users/push_deliveries/${body.deliveryId}/clicked`,
    "POST",
  );
}
