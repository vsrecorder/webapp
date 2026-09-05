import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

import { DeckCodePostLikeResponseType } from "@app/types/deck_code_post";

async function toggleLike(method: "PUT" | "DELETE", uid: string, id: string) {
  return await fetchUpstream<DeckCodePostLikeResponseType>(
    upstreamUrl`/api/v1beta/deck_code_posts/${id}/like`,
    {
      method,
      headers: {
        Authorization: "Bearer " + signUpstreamToken(uid),
        Accept: "application/json",
      },
    },
  );
}

// いいね。更新後の投稿(件数・自分が押したか・直近のいいねした人)を返す。
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const data = await toggleLike("PUT", session.user.id, id);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}

// いいねの取り消し。
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const data = await toggleLike("DELETE", session.user.id, id);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
