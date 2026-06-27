import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import {
  MatchCreateRequestType,
  MatchCreateResponseType,
  MatchGetResponseType,
} from "@app/types/match";

import * as jwt from "jsonwebtoken";

export async function GET(request: NextRequest) {
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

  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ?? "20";

    const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(`https://${domain}/api/v1beta/matches?limit=${limit}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.json();
      return NextResponse.json(body, { status: res.status });
    }

    const ret: MatchGetResponseType[] = await res.json();

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}

export async function POST(request: NextRequest) {
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

  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const match: MatchCreateRequestType = await request.json();

    const res = await fetch(`https://${domain}/api/v1beta/matches`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(match),
    });

    if (res.status == 201) {
      const ret: MatchCreateResponseType = await res.json();

      return NextResponse.json(ret, { status: 201 });
    } else {
      return res;
    }
  } catch (error) {
    throw error;
  }
}
