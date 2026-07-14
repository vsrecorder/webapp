import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse } from "@app/utils/upstream";

import {
  DeckUpdateRequestType,
  DeckGetByIdResponseType,
  DeckUpdateResponseType,
} from "@app/types/deck";

import * as jwt from "jsonwebtoken";

async function getDeckById(token: string, id: string): Promise<DeckGetByIdResponseType> {
  const domain = process.env.VSRECORDER_DOMAIN;

  return await fetchUpstream<DeckGetByIdResponseType>(
    `https://${domain}/api/v1beta/decks/${id}`,
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

    const deck = await getDeckById(token, id);

    return NextResponse.json(deck, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}

export async function PUT(
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

    const domain = process.env.VSRECORDER_DOMAIN;

    const deck: DeckUpdateRequestType = await request.json();

    const updated = await fetchUpstream<DeckUpdateResponseType>(
      `https://${domain}/api/v1beta/decks/${id}`,
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deck),
      },
    );

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}

export async function DELETE(
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

    const domain = process.env.VSRECORDER_DOMAIN;

    await fetchUpstream<null>(`https://${domain}/api/v1beta/decks/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
