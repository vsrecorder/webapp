import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { MatchReorderRequestType } from "@app/types/match";

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

    const body: MatchReorderRequestType = await request.json();

    const res = await fetch(
      `https://${domain}/api/v1beta/records/${id}/matches/order`,
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (res.status == 204) {
      return new NextResponse(null, { status: 204 });
    } else {
      return res;
    }
  } catch (error) {
    throw error;
  }
}
