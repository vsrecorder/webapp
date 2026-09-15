import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";
import { deleteFirebaseUserWithRetry, getFirebaseAdmin } from "@firebase/admin";

import { UserGetByIdResponseType, UserUpdateRequestType, UserUpdateResponseType } from "@app/types/user";

import {
  UpstreamError,
  fetchUpstream,
  upstreamErrorResponse,
  upstreamUrl,
} from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const user = await fetchUpstream<UserGetByIdResponseType>(
      upstreamUrl`/api/v1beta/users/${id}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
      },
    );

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    if (error instanceof UpstreamError) {
      // このルートの404は「core-apiserverがユーザ不在と答えた」ことを意味させる。
      // プロキシ層の障害時などはバックエンドを経由しないHTMLの404が返ることがあり、
      // それをそのまま404で返すと、呼び出し側(サインイン失敗時のロールバック等)が
      // 実在するユーザを不在と誤認しかねないため、502で区別する。
      if (error.status === 404 && !error.bodyIsJson) {
        return NextResponse.json(
          { error: "upstream returned a non-JSON response" },
          { status: 502 },
        );
      }

      return NextResponse.json({ error: "not found" }, { status: error.status });
    }

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

  const { id } = await params;

  if (session.user.id !== id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const token = signUpstreamToken(session.user.id);
  const body: UserUpdateRequestType = await request.json();

  try {
    const updated = await fetchUpstream<UserUpdateResponseType>(
      upstreamUrl`/api/v1beta/users/${id}`,
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof UpstreamError) {
      return NextResponse.json({ error: "update failed" }, { status: error.status });
    }

    return upstreamErrorResponse(error);
  }
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

  const token = signUpstreamToken(session.user.id);

  try {
    await fetchUpstream(upstreamUrl`/api/v1beta/users/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + token,
      },
    });
  } catch (error) {
    if (error instanceof UpstreamError) {
      return NextResponse.json({ error: "delete failed" }, { status: error.status });
    }

    return upstreamErrorResponse(error);
  }

  // バックエンドの退会処理が完了した後にFirebaseの認証ユーザを削除する。
  //
  // ここで失敗しても退会自体は完了しているため、204を返してログアウトまで進める。
  // エラーを返すと、DB上は退会済みなのに画面上はログインしたままになり、
  // 再試行してもバックエンドが404を返すだけで「退会処理に失敗しました」が出続けてしまう。
  //
  // 消し残した認証ユーザは cmd/check-firebase-users で [A:退会済み] として検出できるため、
  // 本人の退会を妨げるより、残骸を検知して後から回収する方針を採る。
  //
  // getFirebaseAdmin()は初期化に失敗すると例外を投げるため、これもtryの内側に含める。
  try {
    if (!(await deleteFirebaseUserWithRetry(getFirebaseAdmin(), id))) {
      console.error("Firebase user remains after withdrawal (needs manual cleanup):", id);
    }
  } catch (error) {
    console.error(
      "Firebase user remains after withdrawal (needs manual cleanup):",
      id,
      error,
    );
  }

  return new NextResponse(null, { status: 204 });
}
