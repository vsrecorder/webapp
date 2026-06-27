import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { MatchGetResponseType } from "@app/types/match";

import * as jwt from "jsonwebtoken";

export async function GET(
  request: NextRequest,
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

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ?? "10";

    const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(
      `https://${domain}/api/v1beta/users/${id}/matches?limit=${limit}`,
      {
        cache: "no-store",
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      },
    );

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
