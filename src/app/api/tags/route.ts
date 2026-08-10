import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import {
  fetchUpstream,
  upstreamErrorResponse,
  upstreamUrl,
} from "@app/utils/upstream";

import {
  TagGetResponseType,
  TagCreateRequestType,
  TagCreateResponseType,
} from "@app/types/tag";

import * as jwt from "jsonwebtoken";

function signToken(uid: string): string {
  const jwtSecret: jwt.Secret = process.env.VSRECORDER_JWT_SECRET as string;
  const jwtSignOptions: jwt.SignOptions = {
    algorithm: "HS256",
    expiresIn: "10s",
  };
  const jwtPayload = {
    iss: "vsrecorder-webapp",
    uid,
  };

  return jwt.sign(jwtPayload, jwtSecret, jwtSignOptions);
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signToken(session.user.id);

  try {
    const tags = await fetchUpstream<TagGetResponseType>(
      upstreamUrl`/api/v1beta/tags`,
      {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      },
    );

    return NextResponse.json(tags, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signToken(session.user.id);

  try {
    const tag: TagCreateRequestType = await request.json();

    const created = await fetchUpstream<TagCreateResponseType>(
      upstreamUrl`/api/v1beta/tags`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tag),
      },
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
