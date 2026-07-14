import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse } from "@app/utils/upstream";

import {
  DeckGetResponseType,
  DeckCreateRequestType,
  DeckCreateResponseType,
} from "@app/types/deck";

import * as jwt from "jsonwebtoken";

async function getDecks(
  token: string,
  archived: boolean,
  cursor: string,
): Promise<DeckGetResponseType> {
  const domain = process.env.VSRECORDER_DOMAIN;

  return await fetchUpstream<DeckGetResponseType>(
    `https://${domain}/api/v1beta/decks?limit=10&archived=${archived}&cursor=${cursor}`,
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
    const archivedParam = searchParams.get("archived");
    const archived = archivedParam === "true";
    const cursor = searchParams.get("cursor") ?? "";

    const decks = await getDecks(token, archived, cursor);

    return NextResponse.json(decks, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
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
    const domain = process.env.VSRECORDER_DOMAIN;

    const deck: DeckCreateRequestType = await request.json();

    const created = await fetchUpstream<DeckCreateResponseType>(
      `https://${domain}/api/v1beta/decks`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deck),
      },
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
