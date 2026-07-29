import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import {
  UserPlayerGetResponseType,
  UserPlayerCreateRequestType,
  UserPlayerCreateResponseType,
} from "@app/types/user_player";

import { upstreamUrl } from "@app/utils/upstream";
import {
  fetchPlayerAccount,
  PlayerNotFoundError,
  PlayersClubUnavailableError,
} from "@app/utils/players_club";
import {
  InvalidChallengeError,
  parseChallenge,
  signVerification,
} from "@app/utils/user_player_challenge";
import {
  consumeAttempt,
  makeUpstreamToken,
  releaseAttempt,
} from "@app/utils/user_player_upstream";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = makeUpstreamToken(session.user.id);
  const res = await fetch(upstreamUrl`/api/v1beta/usersplayers`, {
    cache: "no-store",
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  }

  const userPlayer: UserPlayerGetResponseType = await res.json();
  return NextResponse.json(userPlayer, { status: 200 });
}

/*
 * 所有権を確認したうえで、player_id と user_id の紐付けを core-apiserver に依頼する。
 *
 * 確認の内容は次の2つで、どちらもこのBFFが行う。
 *   1. チャレンジトークンが、このユーザー・このplayer_id宛に発行されたものか
 *   2. プレイヤーズクラブの現在のアバターが、チャレンジで指定した画像に変わっているか
 *
 * 確認できたら「検証済みトークン」を署名して core-apiserver へ渡す。
 * core-apiserver は署名を確かめ、紐付けの一意性とロックを見て保存する。
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const uid = session.user.id;
  const body: UserPlayerCreateRequestType = await request.json();
  const playerId = typeof body?.player_id === "string" ? body.player_id.trim() : "";

  if (!playerId || playerId.length > 16 || !body?.challenge_token) {
    return NextResponse.json({ message: "bad request" }, { status: 400 });
  }

  let claims;
  try {
    claims = parseChallenge(body.challenge_token);
  } catch (error) {
    if (error instanceof InvalidChallengeError) {
      return NextResponse.json(
        {
          message:
            "invalid or expired ownership challenge, please try again from the beginning",
        },
        { status: 400 },
      );
    }

    throw error;
  }

  // チャレンジは発行時と同じユーザー・同じ player_id に対してのみ有効
  if (claims.uid !== uid || claims.player_id !== playerId) {
    return NextResponse.json(
      {
        message:
          "invalid or expired ownership challenge, please try again from the beginning",
      },
      { status: 400 },
    );
  }

  if (!consumeAttempt(uid, playerId)) {
    return NextResponse.json({ message: "too many requests" }, { status: 429 });
  }

  // 現在のアバターがチャレンジで指定した画像に変更されているか確認する
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

      console.error("user_player_create_upstream_unavailable", {
        uid,
        player_id: playerId,
        error_message: error.message,
      });

      return NextResponse.json({ message: "service unavailable" }, { status: 503 });
    }

    throw error;
  }

  if (account.avatarImage !== claims.challenge_avatar_image_url) {
    return NextResponse.json(
      {
        message: "could not verify that the avatar image has been changed as requested",
      },
      { status: 403 },
    );
  }

  const res = await fetch(upstreamUrl`/api/v1beta/usersplayers`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + makeUpstreamToken(uid),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      player_id: playerId,
      verification_token: signVerification(uid, playerId),
    }),
  });

  const resBody = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(resBody, { status: res.status });
  }

  const created: UserPlayerCreateResponseType = resBody;
  return NextResponse.json(created, { status: 201 });
}
