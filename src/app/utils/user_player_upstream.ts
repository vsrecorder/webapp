/*
 * プレイヤーID連携のルートハンドラで共有する、上流(core-apiserver)呼び出しと
 * レート制限の定義。
 */

// jsonwebtokenはCJSのため、名前空間インポート(import * as)にすると実行環境によって
// 関数がdefault配下に入り呼び出せない。esModuleInteropのある既定インポートで揃える。
import jwt from "jsonwebtoken";
import type { Secret, SignOptions } from "jsonwebtoken";

import { Limiter } from "@app/utils/ratelimit";

// 上流API(core-apiserver)へuidを伝えるための短命トークン。
export function makeUpstreamToken(uid: string): string {
  const jwtSecret: Secret = process.env.VSRECORDER_JWT_SECRET as string;
  const jwtSignOptions: SignOptions = {
    algorithm: "HS256",
    expiresIn: "10s",
  };
  const jwtPayload = {
    iss: "vsrecorder-webapp",
    uid,
  };

  return jwt.sign(jwtPayload, jwtSecret, jwtSignOptions);
}

/*
 * 他人の player_id を大量に試行する、いわゆる総当たりを抑止するためのレート制限。
 * uid単位: 1人のユーザーが短時間に多数の player_id を試すのを防ぐ。
 * player_id単位: 複数アカウントを使って特定の player_id を繰り返し狙うのを防ぐ。
 *
 * 実在確認はここから外部サイトへ問い合わせるため、リクエストを出す前に消費する。
 * player_id単位の上限は、正当な所有者を巻き込まない値として10回を採用している。
 * 連携フローは verify → (アバター変更) → create と進み1回あたり2回消費するため、
 * 10回はやり直しを含めて5周分にあたる。
 */
export const attemptLimiterByUid = new Limiter(10, 60 * 60 * 1000);
export const attemptLimiterByPlayerId = new Limiter(10, 24 * 60 * 60 * 1000);

// 試行枠を消費する。消費できなかった場合は false。
export function consumeAttempt(uid: string, playerId: string): boolean {
  if (!attemptLimiterByUid.allow(uid)) {
    return false;
  }

  if (!attemptLimiterByPlayerId.allow(playerId)) {
    // uid側だけ消費した状態で終わらせない
    attemptLimiterByUid.release(uid);
    return false;
  }

  return true;
}

// 外部サイトの障害など、利用者に責任がない理由で処理を続行できなかった場合に枠を返す。
export function releaseAttempt(uid: string, playerId: string): void {
  attemptLimiterByUid.release(uid);
  attemptLimiterByPlayerId.release(playerId);
}
