import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse } from "@app/utils/upstream";

import { DeckCodeType } from "@app/types/deck_code";

import * as jwt from "jsonwebtoken";

async function getDeckCodesByDeckId(
  token: string,
  deck_id: string,
): Promise<DeckCodeType[]> {
  const domain = process.env.VSRECORDER_DOMAIN;

  return await fetchUpstream<DeckCodeType[]>(
    `https://${domain}/api/v1beta/decks/${deck_id}/deckcodes`,
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
    const deck_id = id;

    const deckcodes = await getDeckCodesByDeckId(token, deck_id);

    return NextResponse.json(deckcodes, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
