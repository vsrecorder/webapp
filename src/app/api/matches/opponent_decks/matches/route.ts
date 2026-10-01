import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { cleanOfficialEventTitle } from "@app/components/organisms/Record/officialEventHelpers";

import { OpponentDeckMatchesGetResponseType } from "@app/types/opponent_deck";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

// 上流に渡すクエリ。組み合わせ(表記 × 1体目 × 2体目)を指定する
const SPEC_PARAMS = ["opponents_deck_info", "pokemon_sprite_id_1", "pokemon_sprite_id_2"];

const UNKNOWN_TITLE = "(タイトル不明)";

/*
 * 相手デッキの組み合わせ 1 つの対戦の一覧。一括編集で、その表記をどの記録でどんな対戦結果に
 * 付けたのかを見せるために使う。
 *
 *   GET /api/matches/opponent_decks/matches?opponents_deck_info=…&pokemon_sprite_id_1=…&pokemon_sprite_id_2=…
 *
 * 対象は常にログイン中のユーザー自身の対戦(上流が uid で絞る)。
 * 公式イベントの名前は記録カードやカレンダーと同じく、店舗名の接頭辞などを除いて短くする。
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signUpstreamToken(session.user.id);

  try {
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();
    for (const key of SPEC_PARAMS) {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    }

    const ret = await fetchUpstream<OpponentDeckMatchesGetResponseType>(
      upstreamUrl`/api/v1beta/matches/opponent_decks/matches?${params}`,
      {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      },
    );

    const data = ret.data.map((match) => ({
      ...match,
      event_title: !match.event_title
        ? UNKNOWN_TITLE
        : match.event_type === "official"
          ? cleanOfficialEventTitle(match.event_title)
          : match.event_title,
    }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
