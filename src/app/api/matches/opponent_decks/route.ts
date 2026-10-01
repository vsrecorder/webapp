import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import {
  OpponentDeckReplaceRequestType,
  OpponentDeckReplaceResponseType,
  OpponentDecksGetResponseType,
} from "@app/types/opponent_deck";

import { readJsonBody } from "@app/utils/requestBody";
import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

/*
 * 自分の対戦結果に付けた相手デッキの一覧と、同じ組み合わせの対戦の一括置き換え。
 *
 *   GET /api/matches/opponent_decks  … 表記 × スプライトごとの対戦の数
 *   PUT /api/matches/opponent_decks  … { from, to } で from と同じ対戦をまとめて to にする
 *
 * 対象は常にログイン中のユーザー自身の対戦(上流が uid で絞る)。
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signUpstreamToken(session.user.id);

  try {
    const ret = await fetchUpstream<OpponentDecksGetResponseType>(
      upstreamUrl`/api/v1beta/matches/opponent_decks`,
      {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      },
    );

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signUpstreamToken(session.user.id);

  try {
    const body = await readJsonBody<OpponentDeckReplaceRequestType>(request);

    const ret = await fetchUpstream<OpponentDeckReplaceResponseType>(
      upstreamUrl`/api/v1beta/matches/opponent_decks`,
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
