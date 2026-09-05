import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { UserPlayerCityleagueResultsGetResponseType } from "@app/types/user_player";

import { upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

// 上流はトークンの uid に紐付いたプレイヤーIDでしか引かないため、ここは
// セッションを確認して中継するだけでよい(プレイヤーIDを受け取る余地を作らない)。
//
// 上流の404(未連携・存在しないシーズン)だけは「入賞0件」の200へ潰す。理由は2つ:
//
//  1. このパネルにとって未連携も該当シーズン無しも「表示するものが無い」だけで、
//     ブラウザから見れば異常ではない。
//  2. このパスはブラウザが直接叩くため、404は nginx のアクセスログにエンドユーザの
//     グローバルIPで載り、fail2ban の nginx-http jail(403/404/444 を600秒に20回でban)の
//     カウント対象になる。proxy/fail2ban/filter.d/nginx-http.conf の除外は
//     `/api/(?:v1beta/)?users?players[ ?]` で usersplayers 直下しか見ておらず、
//     `usersplayers/cityleague_results` は救われない。除外を増やすとスキャナ検知の穴が
//     広がるため(filter側にも「本来はアプリ側を直すべき」と注記がある)、
//     アプリ側で404を出さないようにする。
//
// 401(未認証)・503(連携機能の停止中)は jail の検知対象ステータスに含まれないため、
// そのまま返してよい。
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = new URLSearchParams();
  const season = searchParams.get("season");
  if (season) query.set("season", season);

  const token = signUpstreamToken(session.user.id);
  const res = await fetch(
    upstreamUrl`/api/v1beta/usersplayers/cityleague_results?${query}`,
    {
      cache: "no-store",
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
    },
  );

  if (res.status === 404) {
    const empty: UserPlayerCityleagueResultsGetResponseType = {
      season: season ?? "",
      count: 0,
      results: [],
    };
    return NextResponse.json(empty, { status: 200 });
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  }

  const results: UserPlayerCityleagueResultsGetResponseType = await res.json();
  return NextResponse.json(results, { status: 200 });
}
