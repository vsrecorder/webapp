import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { EnvironmentType } from "@app/types/environment";

import { getJson } from "@app/utils/coreApi";
import { DECK_CODE_PATTERN } from "@app/utils/deckArchetype";
import {
  SIMILAR_DATE_PATTERN,
  environmentOnDate,
  isSimilarDecksAvailableOn,
} from "@app/utils/similarDecks";
import { getSimilarDecks } from "@app/utils/similarDecksServer";

/*
 * デッキコードに構成が近いシティリーグの入賞デッキ(バトラボの類似デッキ検索)。
 *
 *   GET /api/deckcards/{code}/similar?env=<環境 ID>
 *   GET /api/deckcards/{code}/similar?date=<YYYY-MM-DD>
 *
 * 「類似デッキ」シートが使う。env を省略するとバトラボが直近の環境で比べる。
 * date(JST の暦日)を渡すと、その日の環境(environmentOnDate)を決めて env として渡す。
 * みんなの公開デッキは投稿された日の環境で比べるので、投稿日を date で渡してくる。
 * 環境一覧が取れないときは、直近の環境で比べて黙って違う結果を返さないよう 502 にする。
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

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  let environmentId = searchParams.get("env");
  let environmentTitle: string | null = null;

  if (!environmentId && date) {
    if (!SIMILAR_DATE_PATTERN.test(date)) {
      return NextResponse.json({ error: "日付の形式が不正です" }, { status: 400 });
    }
    // 画面はボタンを出さないが、直接叩かれたときも前の環境では比べない
    if (!isSimilarDecksAvailableOn(date)) {
      return NextResponse.json(
        { error: "『30th CELEBRATION』より前の環境のデッキは比べられません" },
        { status: 422 },
      );
    }

    const environments = await getJson<EnvironmentType[]>(`/api/v1beta/environments`);
    if (!environments) {
      return NextResponse.json(
        { error: "類似している入賞デッキをいま取得できません。しばらくしてからやり直してください" },
        { status: 502 },
      );
    }

    const environment = environmentOnDate(environments, date);
    if (!environment) {
      return NextResponse.json(
        { error: "投稿された日の環境が見つからないため、比べられません" },
        { status: 422 },
      );
    }
    environmentId = environment.id;
    environmentTitle = environment.title;
  }

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
    case "unknown_env":
      // 提供範囲より前の環境など、バトラボにその環境の入賞デッキが無い
      return NextResponse.json(
        {
          error: environmentTitle
            ? `投稿された環境『${environmentTitle}』の入賞デッキはバトラボに無いため、比べられません`
            : "この環境の入賞デッキはバトラボに無いため、比べられません",
        },
        { status: 422 },
      );
    case "unreadable":
      return NextResponse.json(
        { error: "このデッキの中身を読み取れませんでした。60 枚になっていないデッキは比べられません" },
        { status: 422 },
      );
    default:
      return NextResponse.json(
        { error: "類似している入賞デッキをいま取得できません。しばらくしてからやり直してください" },
        { status: 502 },
      );
  }
}
