import { NextRequest, NextResponse } from "next/server";

import { auth, markUserDeleted } from "@app/auth";
import { deleteFirebaseUserWithRetry, getFirebaseAdmin } from "@firebase/admin";

import { UserGetByIdResponseType, UserUpdateRequestType, UserUpdateResponseType } from "@app/types/user";

import {
  UpstreamError,
  fetchUpstream,
  upstreamErrorResponse,
  upstreamUrl,
} from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";
import { isTrustedImageUrl } from "@app/utils/trustedImageUrl";

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

  // ボディは型注釈だけでは何も保証されない(壊れた JSON は 500 になり、余計なキーは
  // そのまま上流へ流れる)。上流へ渡すのは name と image_url の 2 つだけに組み直す。
  // image_url は取得先を限定する。OGP 画像の生成がサーバ側でこの URL を取りに行くため、
  // 任意のホストを保存できると内部ネットワークへの GET に使われる(utils/trustedImageUrl 参照)。
  const raw: unknown = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { name, image_url } = raw as Record<string, unknown>;
  if (typeof name !== "string" || !isTrustedImageUrl(image_url)) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const body: UserUpdateRequestType = { name, image_url };

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

  // このプロセスの退会チェックに「退会済み」を覚えさせる。他端末のセッションが
  // 次の確認を待たずに未ログイン扱いになる(auth.ts の markUserDeleted 参照)。
  markUserDeleted(id);

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
