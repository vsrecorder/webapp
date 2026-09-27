import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { DECK_CODE_PATTERN } from "@app/utils/deckArchetype";
import { getSimilarDecks } from "@app/utils/similarDecksServer";

/*
 * デッキコードに構成が近いシティリーグの入賞デッキ(バトラボの類似デッキ検索)。
 *
 *   GET /api/deckcards/{code}/similar?env=<環境 ID>
 *
 * デッキ詳細モーダルの「入賞デッキ」シートが使う。env を省略するとバトラボが直近の環境で比べる。
 *
 * ログイン必須にしている。デッキコード自体は公開の識別子だが、この口は 1 回ごとにバトラボが
 * 公式サイトまでデッキの中身を取りに行くので、誰でも叩ける口にはしない
 * (バトラボ側の流量制限は、こちらのサーバの IP 1 つで受けている)。
 *
 * 取れなかった理由は状態コードで分ける。404 / 400 / 422 は利用者のコードの問題で、
 * 押し直しても変わらない。502 はバトラボに届かなかったときで、押し直せば通ることがある
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { code } = await params;
  if (!DECK_CODE_PATTERN.test(code)) {
    return NextResponse.json({ error: "デッキコードの形式が不正です" }, { status: 400 });
  }

  const environmentId = new URL(request.url).searchParams.get("env");

  const result = await getSimilarDecks(code, environmentId);

  switch (result.status) {
    case "ok":
      return NextResponse.json(result.data, { status: 200 });
    case "not_found":
      return NextResponse.json(
        { error: "このデッキコードは公式サイトに登録されていないため、比べられません" },
        { status: 404 },
      );
    case "invalid":
      return NextResponse.json({ error: "デッキコードの形式が不正です" }, { status: 400 });
    case "unreadable":
      return NextResponse.json(
        { error: "このデッキの中身を読み取れませんでした。60 枚になっていないデッキは比べられません" },
        { status: 422 },
      );
    default:
      return NextResponse.json(
        { error: "似ている入賞デッキをいま取得できません。しばらくしてからやり直してください" },
        { status: 502 },
      );
  }
}
