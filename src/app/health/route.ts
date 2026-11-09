// 外形監視の口。**web → core-apiserver → DB を 1 回でたどり**、どこかが応答しなければ 5xx を返す。
//
//   GET / HEAD /health → 200 "ok"
//                        503 "api unreachable" … core-apiserver に繋がらない・時間切れ・想定外の応答
//                        503 "db unreachable"  … core-apiserver は応答するが DB に届かない
//   (webapp そのものが止まっていれば nginx が 502 を返す。proxy リポジトリの location = /health)
//
// 死活の口は他にもあり、見ているものが違う。
//   /livez       … nginx 自身が 200 を返す。GSLB の監視用。webapp や DB が落ちていても 200
//   /health/web  … webapp が応答できるかだけ。docker の healthcheck 用(上流は呼ばない)
//   /health      … ここ。「サービスとして使えるか」を見る
//
// **GSLB の監視先をこちらに変えないこと。** デプロイや DB の再起動のたびに DNS が切り替わる。
// **docker の healthcheck にも使わないこと。** DB の不調でデプロイの待ち合わせが終わらなくなる。
//
// 認証は通さない(監視から叩けるように)。core-apiserver の確認経路も認証の外にある。
// `@app/auth` などの認証まわりは import しないこと。firebase-admin まで読み込むことになり、
// 監視のたびに無関係な初期化を待つうえ、その不調で監視が落ちる。
import { upstreamOrigin } from "@app/utils/upstream";

// 確認の結果をビルドや Next.js のキャッシュに焼き込まない(要求のたびに上流まで確かめる)
export const dynamic = "force-dynamic";

/** core-apiserver の DB 確認の経路(core-apiserver の dbHealthPath と同じ値) */
const DB_HEALTH_PATH = "/api/v1beta/health/db";

/**
 * core-apiserver の応答を待つ上限。外形監視の時間切れ(多くは 10 秒前後)より短くして、
 * 監視側の時間切れではなく「api unreachable」の 503 として見えるようにする。
 * core-apiserver 側は DB の ping を 2 秒で打ち切るので、DB が遅いときは db unreachable が先に返る
 */
const TIMEOUT_MS = 3000;

/**
 * どこにも覚えさせない(覚えた 200 を返されると障害を見落とす)。
 * 検索結果にも出さない(robots.txt でも塞いでいるが、ヘッダでも示す)
 */
const HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "text/plain; charset=utf-8",
  "X-Robots-Tag": "noindex",
};

function respond(status: number, body: string): Response {
  return new Response(`${body}\n`, { status, headers: HEADERS });
}

export async function GET(): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${upstreamOrigin()}${DB_HEALTH_PATH}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    console.error("[health] core-apiserver に繋がりません:", e);
    return respond(503, "api unreachable");
  }

  if (res.ok) return respond(200, "ok");

  // core-apiserver は DB に届かないときだけ 503 と "db unreachable" を返す。
  // nginx が返す 503(計画メンテナンス・デプロイ中の画面)は本文が違うので、API 側の問題として扱う
  const body = await res.text().catch(() => "");
  if (res.status === 503 && body.trim() === "db unreachable") {
    console.error("[health] core-apiserver が DB に届きません");
    return respond(503, "db unreachable");
  }
  console.error(`[health] core-apiserver の DB 確認が ${res.status} を返しました`);
  return respond(503, "api unreachable");
}

// 監視サービスには HEAD で叩くものがある。中身は GET と同じ確認をする(本文はサーバが落とす)
export const HEAD = GET;
