import { NextResponse } from "next/server";

import { auth } from "@app/auth";

import { UnreadCountResponseType } from "@app/types/notification";

import * as jwt from "jsonwebtoken";

async function getUnreadCount(token: string): Promise<UnreadCountResponseType> {
  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(`https://${domain}/api/v1beta/notifications/unread_count`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
    });

    const ret: UnreadCountResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

export async function GET() {
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
    const ret = await getUnreadCount(token);

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}
