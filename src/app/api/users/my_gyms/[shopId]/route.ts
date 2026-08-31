import { NextRequest, NextResponse } from "next/server";

import { upstreamUrl } from "@app/utils/upstream";

import { signUpstreamToken } from "../_shared";

// Myジムの解除。上流は 204 を返す(登録が無い場合も同じ)。
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> },
) {
  const { token, response } = await signUpstreamToken();
  if (response) return response;

  const { shopId } = await params;

  // shops.id は正の整数。パスに載せる前に形式を絞る。
  if (!/^[1-9][0-9]*$/.test(shopId)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const res = await fetch(upstreamUrl`/api/v1beta/users/my_gyms/${shopId}`, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
    },
  });

  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  // エラー時は上流の JSON をそのまま返す(読めなければ空ボディ)
  const text = await res.text().catch(() => "");
  return new NextResponse(text || null, {
    status: res.status,
    headers: text ? { "Content-Type": "application/json" } : undefined,
  });
}
