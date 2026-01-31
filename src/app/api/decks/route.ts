import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/(default)/auth";

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
  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(
      `https://${domain}/api/v1beta/decks?limit=10&archived=${archived}&cursor=${cursor}`,
      {
        cache: "no-store",
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      },
    );

    const ret: DeckGetResponseType = await res.json();

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
    iss: "vsrecorder-web",
    uid: session.user.id,
  };

  const token = jwt.sign(jwtPayload, jwtSecret, jwtSignOptions);

  try {
    const { searchParams } = new URL(request.url);
    const archivedParam = searchParams.get("archived");
    const archived = archivedParam === "true";
    const cursor = searchParams.get("cursor") ?? "";

    const ret = await getDecks(token, archived, cursor);

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
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
    iss: "vsrecorder-web",
    uid: session.user.id,
  };
  const token = jwt.sign(jwtPayload, jwtSecret, jwtSignOptions);

  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const deck: DeckCreateRequestType = await request.json();

    const res = await fetch(`https://${domain}/api/v1beta/decks`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(deck),
    });

    if (res.status == 201) {
      const ret: DeckCreateResponseType = await res.json();

      return NextResponse.json(ret, { status: 201 });
    } else {
      return res;
    }
  } catch (error) {
    throw error;
  }
}
