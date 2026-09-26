import { NextRequest, NextResponse } from "next/server";

import { DeckArchetypesGetResponseType } from "@app/types/deck_archetype";
import {
  DECK_ARCHETYPE_CODES_PER_REQUEST,
  normalizeDeckCodes,
} from "@app/utils/deckArchetype";
import { getDeckArchetypesByCodes } from "@app/utils/deckArchetypeServer";

/*
 * 入賞デッキの種類(デッキ分類)を、デッキコードでまとめて返す。
 *
 *   GET /api/cityleague_results/deck_archetypes?codes=<デッキコード>,<デッキコード>,...
 *
 * シティリーグ結果一覧が「更に読み込む」で足した 1 日ぶんの入賞に種類を添えるための口。
 * 1 ページ目はサーバ描画(cityleagueListServer)で同じ取得を済ませているので、ここを通るのは
 * 2 ページ目以降と、切り替えて初めて開いたタブのぶんだけ。
 *
 * 上限は vslab の 1 回の照会と同じ 100 件。呼び出し側(CityleagueResults)がその単位で分けて
 * 送ってくるので、ここでは超えたぶんを 400 で返す(1 日ぶんの一覧は最大でも数百件で、
 * 100 件ずつなら URL も 2KB に収まる)。
 *
 * 形の合わないコードは黙って落とす。vslab に送っても「無い」で返るだけなので、
 * 1 つ混ざっていたからといって残りの表示まで止めない。
 */
export async function GET(request: NextRequest) {
  const raw = new URL(request.url).searchParams.get("codes") ?? "";
  const codes = normalizeDeckCodes(raw.split(","));

  if (codes.length === 0) {
    return NextResponse.json({ error: "codes is required" }, { status: 400 });
  }

  if (codes.length > DECK_ARCHETYPE_CODES_PER_REQUEST) {
    return NextResponse.json(
      { error: `codes must be at most ${DECK_ARCHETYPE_CODES_PER_REQUEST}` },
      { status: 400 },
    );
  }

  const decks = await getDeckArchetypesByCodes(codes);

  const body: DeckArchetypesGetResponseType = { decks };

  return NextResponse.json(body, { status: 200 });
}
