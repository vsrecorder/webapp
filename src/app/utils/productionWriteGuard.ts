/*
 * 本番以外のサーバ(手元の開発サーバ・手元で起動した本番ビルド)から、本番の API へ
 * 書き込ませないための判定。
 *
 * 経緯(2026-09-26): 表示確認のために開発サーバの上流を本番に向けて
 * (VSRECORDER_UPSTREAM_ORIGIN=https://vsrecorder.mobi)起動していた間に、
 * https://local.vsrecorder.mobi でログインした開発用 Firebase のユーザーが本番に存在しなかったため、
 * ログイン処理(auth.ts の authorize)が本番へ POST /api/v1beta/users を送り、
 * 本番 DB に開発用のユーザーが作られた。操作の記録(POST /users/activity)も本番へ届いた。
 *
 * 上流の切り替えは読み取りだけでなく、BFF と認証の書き込みもすべて本番へ流す。
 * 公開ページの見た目を本番データで確かめる使い方は残したいので、読み取り(GET など)は通し、
 * 書き込みだけを送信前に止める。
 *
 * 本番かどうかは VSRECORDER_DOMAIN で見る(本番コンテナは vsrecorder.mobi、手元は
 * local.vsrecorder.mobi)。本番サーバでは何も止めない。
 */

// 本番の公開ホスト。本番 API(core-apiserver)は nginx 経由でここにある。
// dashboard.vsrecorder.mobi(Grafana の公開ダッシュボード。問い合わせが POST)のような
// 別ホストは対象にしない。
export const PRODUCTION_HOST = "vsrecorder.mobi";

// 書き込みにならないメソッド
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

type Env = { VSRECORDER_DOMAIN?: string | undefined; [key: string]: string | undefined };

// このサーバ自身が本番か
export function isProductionServer(env: Env = process.env): boolean {
  return env.VSRECORDER_DOMAIN === PRODUCTION_HOST;
}

// 本番ホストを指しているか。壊れた値は「本番ではない」とする
export function isProductionHost(origin: string | URL): boolean {
  try {
    return new URL(origin).hostname === PRODUCTION_HOST;
  } catch {
    return false;
  }
}

// 本番以外のサーバが、本番へ向けて書き込もうとしているか
export function isBlockedProductionWrite(
  { origin, method }: { origin: string | URL; method: string },
  env: Env = process.env,
): boolean {
  return (
    !isProductionServer(env) &&
    isProductionHost(origin) &&
    !SAFE_METHODS.has(method.toUpperCase())
  );
}

// 本番以外のサーバが、上流として本番 API につながっているか(ログインを断る判定に使う)
export function isProductionUpstreamFromNonProduction(
  upstreamOrigin: string,
  env: Env = process.env,
): boolean {
  return !isProductionServer(env) && isProductionHost(upstreamOrigin);
}

export class ProductionWriteBlockedError extends Error {
  constructor(method: string, origin: string) {
    super(
      `本番以外のサーバから本番 API への書き込みを止めました: ${method} ${origin}` +
        "(VSRECORDER_UPSTREAM_ORIGIN が本番を向いていないか確認してください)",
    );
    this.name = "ProductionWriteBlockedError";
  }
}
