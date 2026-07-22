import { NextResponse } from "next/server";

import { auth } from "@app/auth";

import { KizunaType } from "@app/types/kizuna";

import * as jwt from "jsonwebtoken";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

// デッキごとのきずなLv.を返す。期間で絞る口は無い
// （きずなは「これまでどう歩んできたか」であり、今月だけのきずな、という概念が無い）。
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
  const token = jwt.sign(jwtPayload, jwtSecret, jwtSignOptions);

  const { id } = await params;
  // 他人のIDを指定されてもバックエンドが403で弾くが、無駄な往復を避けるため手前で弾く。
  if (session.user.id !== id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const kizuna = await fetchUpstream<KizunaType>(
      upstreamUrl`/api/v1beta/users/${id}/kizuna`,
      {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      },
    );

    return NextResponse.json(kizuna, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
