import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { OpponentDeckCandidatesGetResponseType } from "@app/types/opponent_deck_candidate";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

// 相手デッキの入力候補。自身の履歴からの候補を先頭に、不足分を全ユーザーの候補で埋めたものを
// 上流がまとめて返す(併合・重複排除・期間の絞り込み・出現回数の集計はすべて上流で済んでいる)。
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signUpstreamToken(session.user.id);

  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ?? "50";

    const ret = await fetchUpstream<OpponentDeckCandidatesGetResponseType>(
      upstreamUrl`/api/v1beta/matches/opponent_deck_candidates?limit=${limit}`,
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
