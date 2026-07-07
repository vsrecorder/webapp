import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import * as jwt from "jsonwebtoken";

async function markNotificationAsRead(token: string, id: string): Promise<Response> {
  const domain = process.env.VSRECORDER_DOMAIN;

  return fetch(`https://${domain}/api/v1beta/notifications/${id}/read`, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
    },
  });
}

export async function PATCH(
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

  const { id } = await params;

  // 既読化はcore-apiserver側が204 No Contentで返すためJSONボディはパースしない
  const res = await markNotificationAsRead(token, id);

  return new NextResponse(null, { status: res.status });
}
