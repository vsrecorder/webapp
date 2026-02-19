import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/(default)/auth";

import { MatchUpdateRequestType, MatchUpdateResponseType } from "@app/types/match";

import * as jwt from "jsonwebtoken";

export async function PUT(
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

    const domain = process.env.VSRECORDER_DOMAIN;

    const deck: MatchUpdateRequestType = await request.json();

    const res = await fetch(`https://${domain}/api/v1beta/matches/${id}`, {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(deck),
    });

    if (res.status == 200) {
      const ret: MatchUpdateResponseType = await res.json();

      return NextResponse.json(ret, { status: 200 });
    } else {
      return res;
    }
  } catch (error) {
    throw error;
  }
}
