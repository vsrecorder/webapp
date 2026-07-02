import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";
import { getFirebaseAdmin } from "@firebase/admin";

import { UserGetByIdResponseType, UserUpdateRequestType, UserUpdateResponseType } from "@app/types/user";

import * as jwt from "jsonwebtoken";

function makeToken(uid: string): string {
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const domain = process.env.VSRECORDER_DOMAIN;

  const res = await fetch(`https://${domain}/api/v1beta/users/${id}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "not found" }, { status: res.status });
  }

  const user: UserGetByIdResponseType = await res.json();
  return NextResponse.json(user, { status: 200 });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (session.user.id !== id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const token = makeToken(session.user.id);
  const domain = process.env.VSRECORDER_DOMAIN;

  const body: UserUpdateRequestType = await request.json();

  const res = await fetch(`https://${domain}/api/v1beta/users/${id}`, {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "update failed" }, { status: res.status });
  }

  const updated: UserUpdateResponseType = await res.json();
  return NextResponse.json(updated, { status: 200 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (session.user.id !== id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const token = makeToken(session.user.id);
  const domain = process.env.VSRECORDER_DOMAIN;

  const res = await fetch(`https://${domain}/api/v1beta/users/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + token,
    },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "delete failed" }, { status: res.status });
  }

  // バックエンドの退会処理が完了した後にFirebaseの認証ユーザを削除する
  try {
    await getFirebaseAdmin().auth().deleteUser(id);
  } catch (error) {
    console.error("Failed to delete firebase user:", error);
  }

  return new NextResponse(null, { status: 204 });
}
