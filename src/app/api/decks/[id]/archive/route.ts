import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

import { DeckArchiveResponse } from "@app/types/deck";

import * as jwt from "jsonwebtoken";

async function archiveDeckById(token: string, id: string): Promise<DeckArchiveResponse> {
  return await fetchUpstream<DeckArchiveResponse>(
    upstreamUrl`/api/v1beta/decks/${id}/archive`,
    {
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
    },
  );
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

  try {
    const { id } = await params;

    const archived = await archiveDeckById(token, id);

    return NextResponse.json(archived, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
