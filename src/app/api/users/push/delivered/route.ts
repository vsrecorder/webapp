import { NextRequest, NextResponse } from "next/server";

import { upstreamUrl } from "@app/utils/upstream";

import { isValidDeliveryId, relay } from "../_shared";
import { requireUpstreamToken } from "@app/utils/upstreamToken";

// push が端末に届いたことの記録(B-1)。Service Worker の push ハンドラから呼ばれる。
export async function POST(request: NextRequest) {
  const { token, response } = await requireUpstreamToken();
  if (response) return response;

  const body = (await request.json().catch(() => null)) as { deliveryId?: unknown } | null;
  if (!body || !isValidDeliveryId(body.deliveryId)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  return relay(
    token,
    upstreamUrl`/api/v1beta/users/push_deliveries/${body.deliveryId}/delivered`,
    "POST",
  );
}
