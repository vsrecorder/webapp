import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import {
  UserPlayerGetResponseType,
  UserPlayerCreateRequestType,
  UserPlayerCreateResponseType,
} from "@app/types/user_player";

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

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = makeToken(session.user.id);
  const res = await fetch(upstreamUrl`/api/v1beta/usersplayers`, {
    cache: "no-store",
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  }

  const userPlayer: UserPlayerGetResponseType = await res.json();
  return NextResponse.json(userPlayer, { status: 200 });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = makeToken(session.user.id);
  const body: UserPlayerCreateRequestType = await request.json();

  const res = await fetch(upstreamUrl`/api/v1beta/usersplayers`, {
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

  const created: UserPlayerCreateResponseType = resBody;
  return NextResponse.json(created, { status: 201 });
}
