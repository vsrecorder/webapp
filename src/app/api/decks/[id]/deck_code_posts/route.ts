import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

import { DeckCodePostGetByDeckIdResponseType } from "@app/types/deck_code_post";

// デッキの公開中の投稿(全バージョン分)。デッキ詳細モーダル・バージョン履歴の
// 公開スイッチの状態に使う。所有者本人だけが参照できる(上流で確認する)。
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const data = await fetchUpstream<DeckCodePostGetByDeckIdResponseType>(
      upstreamUrl`/api/v1beta/decks/${id}/deck_code_posts`,
      {
        method: "GET",
        headers: {
          Authorization: "Bearer " + signUpstreamToken(session.user.id),
          Accept: "application/json",
        },
      },
    );

    return NextResponse.json(data ?? [], { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
