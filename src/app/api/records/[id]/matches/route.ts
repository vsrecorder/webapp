import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/(default)/auth";

import { MatchGetResponseType } from "@app/types/match";

import * as jwt from "jsonwebtoken";

async function getMatches(
  token: string,
  record_id: string,
): Promise<MatchGetResponseType[]> {
  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(`https://${domain}/api/v1beta/records/${record_id}/matches`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
    });

    const ret: MatchGetResponseType[] = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

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
    const record_id = id;

    const ret = await getMatches(token, record_id);

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}
