import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import {
  UserPlayerVerifyRequestType,
  UserPlayerVerifyResponseType,
} from "@app/types/user_player";

import { upstreamUrl } from "@app/utils/upstream";
import {
  fetchPlayerAccount,
  PlayerNotFoundError,
  PlayersClubUnavailableError,
} from "@app/utils/players_club";
import { signChallenge } from "@app/utils/user_player_challenge";
import {
  consumeAttempt,
  makeUpstreamToken,
  releaseAttempt,
} from "@app/utils/user_player_upstream";

type ChallengeAvatarResponse = {
  avatar_id: number;
  avatar_title: string;
  avatar_image_url: string;
  avatar_detail: string;
};

/*
 * プレイヤーIDの実在確認と、所有権確認チャレンジの発行を行う。
 *
 * プレイヤーズクラブへの問い合わせはこのBFFが担い、core-apiserver へは
 * チャレンジで提示するアバター(DBが持つ)の払い出しだけを依頼する。
 * この時点ではまだ何も永続化しない。
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const uid = session.user.id;
  const body: UserPlayerVerifyRequestType = await request.json();
  const playerId = typeof body?.player_id === "string" ? body.player_id.trim() : "";

  if (!playerId || playerId.length > 16) {
    return NextResponse.json({ message: "bad request" }, { status: 400 });
  }

  // 外部サイトへ問い合わせる前に総当たりを止める
  if (!consumeAttempt(uid, playerId)) {
    return NextResponse.json({ message: "too many requests" }, { status: 429 });
  }

  let account;
  try {
    account = await fetchPlayerAccount(playerId);
  } catch (error) {
    if (error instanceof PlayerNotFoundError) {
      return NextResponse.json(
        { message: "player not found or my page is private" },
        { status: 400 },
      );
    }

    if (error instanceof PlayersClubUnavailableError) {
      // 利用者に責任がない失敗のため試行枠を返す
      releaseAttempt(uid, playerId);

      console.error("user_player_verify_upstream_unavailable", {
        uid,
        player_id: playerId,
        error_message: error.message,
      });

      return NextResponse.json({ message: "service unavailable" }, { status: 503 });
    }

    throw error;
  }

  // チャレンジで提示するアバターは core-apiserver のDBが持つため払い出してもらう
  const challengeRes = await fetch(upstreamUrl`/api/v1beta/usersplayers/challenge`, {
    cache: "no-store",
    method: "POST",
    headers: {
      Authorization: "Bearer " + makeUpstreamToken(uid),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ current_avatar_image: account.avatarImage }),
  });

  if (!challengeRes.ok) {
    // 上流の障害・機能停止であり利用者に責任がないため試行枠を返す
    releaseAttempt(uid, playerId);

    const errorBody = await challengeRes.json().catch(() => ({}));
    return NextResponse.json(errorBody, { status: challengeRes.status });
  }

  const avatar: ChallengeAvatarResponse = await challengeRes.json();

  const { token, expiresAt } = signChallenge({
    uid,
    player_id: playerId,
    challenge_avatar_image_url: avatar.avatar_image_url,
  });

  const verified: UserPlayerVerifyResponseType = {
    player_id: account.playerId,
    nickname: account.nickname,
    avatar_image: account.avatarImage,
    current_league: account.currentLeague,
    prefecture: account.prefecture,
    challenge: {
      token,
      avatar_id: avatar.avatar_id,
      avatar_title: avatar.avatar_title,
      avatar_image_url: avatar.avatar_image_url,
      avatar_detail: avatar.avatar_detail,
      expires_at: expiresAt.toISOString(),
    },
  };

  return NextResponse.json(verified, { status: 200 });
}
