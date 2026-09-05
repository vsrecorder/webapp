import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import {
  fetchUpstream,
  upstreamErrorResponse,
  upstreamUrl,
} from "@app/utils/upstream";

import { TagGetResponseType } from "@app/types/tag";
import { signUpstreamToken } from "@app/utils/upstreamToken";

function signToken(uid: string): string {
  return signUpstreamToken(uid);
}

// 全ユーザー共通のプリセットタグ(ACE SPEC・大会順位)を取得する。
// category クエリ(acespec / placement)で群を絞れる。付与先ごとに見せたい
// プリセットが違うため、そのままバックエンドへ中継する。
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signToken(session.user.id);

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") ?? "";

    const tags = await fetchUpstream<TagGetResponseType>(
      upstreamUrl`/api/v1beta/tags/presets?category=${category}`,
      {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      },
    );

    return NextResponse.json(tags, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
