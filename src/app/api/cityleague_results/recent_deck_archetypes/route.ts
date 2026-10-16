import { NextRequest, NextResponse } from "next/server";

import { RecentDeckArchetypesType } from "@app/types/deck_archetype";
import {
  getRecentDeckArchetypes,
  pickRecentDeckArchetypes,
} from "@app/utils/cityleagueAwaitingServer";

/*
 * 直近(今日・昨日)の大会の、デッキ分類が揃っているかの判定を返す。
 *
 *   GET /api/cityleague_results/recent_deck_archetypes?league_type=<1|2|3>&date=<YYYY-MM-DD>
 *
 * シティリーグ結果一覧とホームの「本日のシティリーグ」が、分類待ちの大会を出さずにおくために使う。
 * 判定はサーバの 1 枚(cityleagueAwaitingServer)をそのまま返すので、ハブ・個別ページと食い違わない。
 * 出してよい大会の入賞デッキの種類も一緒に返す(判定と同じ答えなので、出した大会に種類の行が欠けない)。
 *
 * league_type・date はどちらも省略できる(省略すると絞らない)。判定を作れなかったときは 503。
 * 呼び出し側はそのとき何も隠さずに、これまでの分類の取得(deck_archetypes)で出す。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const leagueTypeParam = searchParams.get("league_type");
  const leagueType = leagueTypeParam === null ? undefined : Number(leagueTypeParam);
  if (leagueType !== undefined && (!Number.isInteger(leagueType) || leagueType <= 0)) {
    return NextResponse.json({ error: "league_type must be a positive integer" }, { status: 400 });
  }

  const date = searchParams.get("date") ?? undefined;
  if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  const snapshot = await getRecentDeckArchetypes();
  if (!snapshot) {
    return NextResponse.json({ error: "recent deck archetypes are unavailable" }, { status: 503 });
  }

  const body: RecentDeckArchetypesType = pickRecentDeckArchetypes(snapshot, { leagueType, date });

  return NextResponse.json(body, {
    status: 200,
    // 判定は 30 秒刻みで変わる。ブラウザや中継に古い判定を持たせない
    headers: { "Cache-Control": "no-store" },
  });
}
