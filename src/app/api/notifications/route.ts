import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import { NotificationsGetResponseType } from "@app/types/notification";

import * as jwt from "jsonwebtoken";

async function getNotifications(
  token: string,
  limit: string,
): Promise<NotificationsGetResponseType> {
  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(`https://${domain}/api/v1beta/notifications?limit=${limit}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
    });

    const ret: NotificationsGetResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

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
    const limit = searchParams.get("limit") ?? "";

    const ret = await getNotifications(token, limit);

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}
