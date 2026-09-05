import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import {
  UserPlayerGetResponseType,
  UserPlayerCreateRequestType,
  UserPlayerCreateResponseType,
} from "@app/types/user_player";

import { upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

// 未連携(上流404)は null を200で返す。「まだ連携していない」は大多数のユーザにとっての
// 通常状態であって異常ではなく、404で返すとブラウザが画面を開くたびにアクセスログへ4xxを積む。
//
// このパスはブラウザが直接叩くため、その404はエンドユーザのグローバルIPで記録され、
// fail2ban の nginx-http jail(403/404/444 を600秒に20回でban)のカウント対象になる。
// 実ログ(2026-08-16〜17)では1端末が10分間に16回まで到達しており、閾値20まで余裕が4回しか
// 無かった。現状は filter.d/nginx-http.conf の除外パターンで救われているが、除外の綴りが
// 1文字ずれるだけで正常なユーザが80/443ごとbanされる。除外に頼らず、ここで404を出さない。
//
// 呼び出し側(PlayerLinkCard・DesignationPanel・UserProfileCard)はいずれも
// `r.ok ? r.json() : null` で受けているため、200+null でも従来と同じ「未連携」表示になる。
// 同じ理由の200化は /api/cityleague_schedules・/api/usersplayers/cityleague_results でも行っている。
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signUpstreamToken(session.user.id);
  const res = await fetch(upstreamUrl`/api/v1beta/usersplayers`, {
    cache: "no-store",
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
    },
  });

  if (res.status === 404) {
    return NextResponse.json(null, { status: 200 });
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  }

  const userPlayer: UserPlayerGetResponseType = await res.json();
  return NextResponse.json(userPlayer, { status: 200 });
}

// プレイヤーIDの実在確認・所有権確認は行わない(利用者の自己申告として受け入れる)ため、
// ここはセッションを確認して上流へ中継するだけでよい。
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signUpstreamToken(session.user.id);
  const body: UserPlayerCreateRequestType = await request.json();

  const res = await fetch(upstreamUrl`/api/v1beta/usersplayers`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const resBody = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(resBody, { status: res.status });
  }

  const created: UserPlayerCreateResponseType = resBody;
  return NextResponse.json(created, { status: 201 });
}
