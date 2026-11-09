import { NextResponse } from "next/server";

import { upstreamUrl } from "@app/utils/upstream";
import { isProxyOutageResponse } from "@app/utils/upstreamOutage";

/*
 * core-apiserver に届くかどうか(アップデート中の覆いが復旧を確かめる口)。
 *
 *   GET /api/upstream_status → 200 { status: "ok" } / 503 { status: "unavailable" }
 *
 * 覆い(components/organisms/Layout/UpdateOverlay.tsx)と error.tsx が、出ている間だけ
 * 3秒おきに叩く。webapp 自体を入れ替えている間は、ここに届かず nginx の deploying.html
 * (HTML の 503)が返るので、ブラウザからは同じ「まだ」に見える。
 *
 * ■ 届いた・届かないの判定
 * nginx が上流に繋がらないときの HTML の 502/503/504 と、接続そのものの失敗だけを「届かない」とする。
 * core-apiserver が答えたなら(JSON の 500 でも)届いている。DB の不調はアップデートではないので、
 * 覆いを出し続ける理由にならない。
 * 時間切れも「届かない」に入れる。止まりかけ・立ち上がりかけの上流に覆いを外して操作させると、
 * すぐまた失敗するため。
 *
 * ■ 叩き先
 * core-apiserver の /health は nginx が /api/v1beta 配下しか流さないため公開ドメイン経由では届かない。
 * 認証が要らず軽い /api/v1beta/regulations を使う。覆いが出ている間しか叩かれないので負荷は無視できる。
 * 繋ぎ直し(utils/coreApiFetch.ts)は通さない。待つのは呼ぶ側(3秒おき)の仕事。
 */

// ブラウザ側の時間切れ(utils/upstreamOutageClient.ts の 2.5 秒)より十分短くし、遅いときも
// ブラウザには「届かない(503)」として返るようにする(ブラウザの時間切れは回線の問題として扱われる)
const CHECK_TIMEOUT_MS = 1_500;

export const dynamic = "force-dynamic";

function respond(ok: boolean): NextResponse {
  return NextResponse.json(
    { status: ok ? "ok" : "unavailable" },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  try {
    const res = await fetch(upstreamUrl`/api/v1beta/regulations`, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
    // 本文は使わない。読まずに捨てて接続を返す(待たない理由は utils/coreApiFetch.ts の同じ箇所)
    void res.body?.cancel().catch(() => {});
    return respond(!isProxyOutageResponse(res));
  } catch {
    return respond(false);
  }
}
