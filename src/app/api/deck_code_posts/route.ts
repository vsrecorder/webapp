import { NextRequest, NextResponse, after } from "next/server";

import { auth } from "@app/auth";

import { ensureDeckCodePostOgImage } from "@app/utils/deckCodePostOg";
import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { optionalAuthorizationHeader, signUpstreamToken } from "@app/utils/upstreamToken";

import {
  DeckCodePostCreateRequestType,
  DeckCodePostCreateResponseType,
  DeckCodePostGetResponseType,
} from "@app/types/deck_code_post";

// 一覧はログイン不要。ログイン中はトークンを付けて「自分がいいね済みか」を上流に判定させる。
export async function GET(request: NextRequest) {
  const session = await auth();

  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams();
  for (const key of ["sort", "environment_id", "acespec_card_name", "limit", "offset"]) {
    const value = searchParams.get(key);
    if (value) params.set(key, value);
  }
  // スプライトは最大2体を繰り返しで渡す(すべてを持つデッキに絞る)
  for (const id of searchParams.getAll("pokemon_sprite_id")) {
    if (id) params.append("pokemon_sprite_id", id);
  }

  try {
    const data = await fetchUpstream<DeckCodePostGetResponseType>(
      upstreamUrl`/api/v1beta/deck_code_posts?${params}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...optionalAuthorizationHeader(session?.user.id),
        },
      },
    );

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}

// 公開(投稿の作成)。
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body: DeckCodePostCreateRequestType = await request.json();

    const data = await fetchUpstream<DeckCodePostCreateResponseType>(
      upstreamUrl`/api/v1beta/deck_code_posts`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + signUpstreamToken(session.user.id),
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    // OGP 画像は応答を返した後に先回りで作る。最初に個別ページを開く人(多くは投稿者が
    // X にポストした直後のカード取得)が数百 ms の生成を待たないようにするため。
    // 失敗しても個別ページ側が同じキーで作り直すので、ここでは結果を見ない。
    after(() => ensureDeckCodePostOgImage(data));

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
