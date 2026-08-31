import { NextResponse } from "next/server";

import { auth } from "@app/auth";

import * as jwt from "jsonwebtoken";

/*
 * Myジムの BFF 共通処理。
 *
 * 4本(一覧 / 登録 / 解除 / イベント一覧)はいずれも「NextAuth のセッションを確認 →
 * 10秒 JWT を署名 → core-apiserver へ中継」で、users/push/_shared.ts と同じ型。
 * 上流は uid をトークンから取るため、パスにユーザIDは載せない。
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

  return {
    token: jwt.sign({ iss: "vsrecorder-webapp", uid: session.user.id }, jwtSecret, {
      algorithm: "HS256",
      expiresIn: "10s",
    }),
  };
}
