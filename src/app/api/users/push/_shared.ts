import { NextResponse } from "next/server";

import { auth } from "@app/auth";

import * as jwt from "jsonwebtoken";

/*
 * Web Push(B-1)の BFF 共通処理。
 *
 * 4本(subscribe / unsubscribe / delivered / clicked)はいずれも
 * 「NextAuth のセッションを確認 → 10秒 JWT を署名 → core-apiserver へ中継」で、
 * activity/route.ts と同じ型。上流のステータスをそのまま返し、ボディは読まない
 * (すべて 204 No Content で返る)。
 *
 * ファイル名を _ 始まりにしているのは、App Router のルートとして解決させないため。
 */

// セッションが無ければ 401 を返し、あれば上流用の署名済みトークンを返す。
export async function signUpstreamToken(): Promise<
  { token: string; response?: undefined } | { token?: undefined; response: NextResponse }
> {
  const session = await auth();
  if (!session) {
    return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }

  const jwtSecret: jwt.Secret = process.env.VSRECORDER_JWT_SECRET as string;
  const jwtSignOptions: jwt.SignOptions = {
    algorithm: "HS256",
    expiresIn: "10s",
  };
  const jwtPayload = {
    iss: "vsrecorder-webapp",
    uid: session.user.id,
  };

  return { token: jwt.sign(jwtPayload, jwtSecret, jwtSignOptions) };
}

// 上流へ中継し、ステータスだけを返す(上流はボディ無しの 204 か、エラー JSON)。
export async function relay(
  token: string,
  url: string,
  method: "POST" | "DELETE",
  body?: unknown,
): Promise<NextResponse> {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
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

// deliveryId は ULID(26文字の英数字)。パスに載せるため形式を絞る。
const DELIVERY_ID_PATTERN = /^[0-9A-Za-z]{26}$/;

export function isValidDeliveryId(value: unknown): value is string {
  return typeof value === "string" && DELIVERY_ID_PATTERN.test(value);
}
