import { NextResponse } from "next/server";

import * as jwt from "jsonwebtoken";

import { auth } from "@app/auth";

/*
 * 上流API(core-apiserver)へ渡す短命のJWTを発行する。
 *
 * 署名鍵(VSRECORDER_JWT_SECRET)・発行者(iss)・有効期限(10秒)は core-apiserver 側の検証と
 * 一致させる必要があるため、発行はこのファイルだけで行う。ルートハンドラやサーバ
 * コンポーネントは jwt.sign を直接書かず、ここの関数を使うこと。
 */

const ISSUER = "vsrecorder-webapp";
const DEFAULT_EXPIRES_IN = "10s";

type SignOptions = {
  // 有効期限("60s" など)。既定の10秒で足りない(上流が長く掛かる)呼び出しだけ延ばす
  expiresIn?: jwt.SignOptions["expiresIn"];
};

export function signUpstreamToken(uid: string, options: SignOptions = {}): string {
  const jwtSecret: jwt.Secret = process.env.VSRECORDER_JWT_SECRET as string;

  return jwt.sign({ iss: ISSUER, uid }, jwtSecret, {
    algorithm: "HS256",
    expiresIn: options.expiresIn ?? DEFAULT_EXPIRES_IN,
  });
}

// ログイン中ならAuthorizationヘッダを、していなければ空のヘッダを返す。
// 未ログインでも参照できるエンドポイントで、ログイン時だけ「自分がいいね済みか」などを
// 上流に判定させるために使う。
export function optionalAuthorizationHeader(uid: string | null | undefined): Record<string, string> {
  if (!uid) return {};

  return { Authorization: "Bearer " + signUpstreamToken(uid) };
}

// ログイン必須の BFF 用。セッションが無ければ 401 の応答を、あれば署名済みトークンを返す。
//
//   const { token, response } = await requireUpstreamToken();
//   if (response) return response;
export async function requireUpstreamToken(): Promise<
  { token: string; response?: undefined } | { token?: undefined; response: NextResponse }
> {
  const session = await auth();
  if (!session) {
    return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }

  return { token: signUpstreamToken(session.user.id) };
}
