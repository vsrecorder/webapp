import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

import { NotificationsGetResponseType } from "@app/types/notification";

import * as jwt from "jsonwebtoken";

async function getNotifications(
  token: string,
  limit: string,
): Promise<NotificationsGetResponseType> {
  return await fetchUpstream<NotificationsGetResponseType>(
    upstreamUrl`/api/v1beta/notifications?limit=${limit}`,
    {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
    },
  );
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

    const notifications = await getNotifications(token, limit);

    return NextResponse.json(notifications, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
