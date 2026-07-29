/*
 * プレイヤーID所有権確認(アバター変更チャレンジ)のトークンを扱う。
 *
 * 検証はBFF(このwebapp)で完結させ、core-apiserver へは「検証済みである」ことを
 * 署名付きで伝える。ここで扱うトークンは2種類ある。
 *
 *  - チャレンジトークン: verify応答としてブラウザへ渡し、登録リクエストで返してもらう。
 *    「このユーザーが、このplayer_idについて、このアバターへの変更を求められた」事実を持つ。
 *  - 検証済みトークン: webapp が core-apiserver へ渡す。ブラウザには渡さない。
 *    「webapp が所有権を確認した」ことの証明。
 *
 * iss は認証用トークン(vsrecorder-webapp)と必ず別にする。同じにすると、ブラウザへ
 * 渡るチャレンジトークンが core-apiserver の認証Bearerトークンとしても通ってしまう。
 */

// jsonwebtokenはCJSのため、名前空間インポート(import * as)にすると実行環境によって
// 関数がdefault配下に入り呼び出せない。esModuleInteropのある既定インポートで揃える。
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

const CHALLENGE_ISSUER = "vsrecorder-webapp-user-player-challenge";
const VERIFICATION_ISSUER = "vsrecorder-webapp-user-player-verification";

// 利用者がプレイヤーズクラブでアバターを変更するのに必要な時間として10分を確保する。
const CHALLENGE_TTL_SECONDS = 10 * 60;

// 検証済みトークンは発行直後に core-apiserver へ渡すだけなので短くてよい。
const VERIFICATION_TTL_SECONDS = 60;

// チャレンジトークンが改ざん・期限切れ、または発行時と異なる対象に使われた。
export class InvalidChallengeError extends Error {
  constructor() {
    super("invalid or expired ownership challenge");
    this.name = "InvalidChallengeError";
  }
}

export type ChallengeClaims = {
  uid: string;
  player_id: string;
  challenge_avatar_image_url: string;
};

// 空鍵で署名すると誰でも同じ内容のトークンを作れてしまい、所有権確認が意味を成さない。
// 起動時ではなく利用時にも必ず失敗させる。
function secret(): string {
  const value = process.env.VSRECORDER_JWT_SECRET;

  if (!value) {
    throw new Error("VSRECORDER_JWT_SECRET is not configured");
  }

  return value;
}

export function signChallenge(claims: ChallengeClaims): {
  token: string;
  expiresAt: Date;
} {
  const token = jwt.sign(claims, secret(), {
    algorithm: "HS256",
    issuer: CHALLENGE_ISSUER,
    expiresIn: CHALLENGE_TTL_SECONDS,
  });

  return {
    token,
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_SECONDS * 1000),
  };
}

export function parseChallenge(token: string): ChallengeClaims {
  let decoded: JwtPayload;

  try {
    decoded = jwt.verify(token, secret(), {
      algorithms: ["HS256"],
      issuer: CHALLENGE_ISSUER,
    }) as JwtPayload;
  } catch {
    throw new InvalidChallengeError();
  }

  const { uid, player_id, challenge_avatar_image_url } = decoded;

  if (
    typeof uid !== "string" ||
    typeof player_id !== "string" ||
    typeof challenge_avatar_image_url !== "string" ||
    // expを持たないトークンは失効しないため受け付けない
    typeof decoded.exp !== "number"
  ) {
    throw new InvalidChallengeError();
  }

  return { uid, player_id, challenge_avatar_image_url };
}

// signVerification は「webapp が uid と player_id の対応を確認した」ことを
// core-apiserver 向けに署名する。ブラウザへは渡さない。
export function signVerification(uid: string, playerId: string): string {
  return jwt.sign({ uid, player_id: playerId }, secret(), {
    algorithm: "HS256",
    issuer: VERIFICATION_ISSUER,
    expiresIn: VERIFICATION_TTL_SECONDS,
  });
}
