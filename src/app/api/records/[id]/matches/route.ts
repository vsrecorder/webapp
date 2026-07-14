import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse } from "@app/utils/upstream";

import { MatchGetResponseType } from "@app/types/match";

import * as jwt from "jsonwebtoken";

async function getMatches(
  token: string,
  record_id: string,
): Promise<MatchGetResponseType[]> {
  const domain = process.env.VSRECORDER_DOMAIN;

  return await fetchUpstream<MatchGetResponseType[]>(
    `https://${domain}/api/v1beta/records/${record_id}/matches`,
    {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
    },
  );
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

    const matches = await getMatches(token, record_id);

    return NextResponse.json(matches, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
