import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import {
  fetchUpstream,
  upstreamErrorResponse,
  upstreamUrl,
} from "@app/utils/upstream";

import {
  TagUpdateRequestType,
  TagUpdateResponseType,
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signToken(session.user.id);

  try {
    const { id } = await params;
    const tag: TagUpdateRequestType = await request.json();

    const updated = await fetchUpstream<TagUpdateResponseType>(
      upstreamUrl`/api/v1beta/tags/${id}`,
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tag),
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

  const token = signToken(session.user.id);

  try {
    const { id } = await params;

    await fetchUpstream<null>(upstreamUrl`/api/v1beta/tags/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
