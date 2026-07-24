import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { UserPlayerVerifyRequestType, UserPlayerVerifyResponseType } from "@app/types/user_player";

import * as jwt from "jsonwebtoken";

import { upstreamUrl } from "@app/utils/upstream";

function makeToken(uid: string): string {
  const jwtSecret: jwt.Secret = process.env.VSRECORDER_JWT_SECRET as string;
  const jwtSignOptions: jwt.SignOptions = {
    algorithm: "HS256",
    expiresIn: "10s",
  };
  const jwtPayload = {
    iss: "vsrecorder-webapp",
    uid,
  };
  return jwt.sign(jwtPayload, jwtSecret, jwtSignOptions);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = makeToken(session.user.id);
  const body: UserPlayerVerifyRequestType = await request.json();

  const res = await fetch(upstreamUrl`/api/v1beta/usersplayers/verify`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const resBody = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(resBody, { status: res.status });
  }

  const verified: UserPlayerVerifyResponseType = resBody;
  return NextResponse.json(verified, { status: 200 });
}
