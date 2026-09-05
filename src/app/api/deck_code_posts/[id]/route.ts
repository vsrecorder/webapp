import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { optionalAuthorizationHeader, signUpstreamToken } from "@app/utils/upstreamToken";

import { DeckCodePostGetByIdResponseType } from "@app/types/deck_code_post";

// 個別取得はログイン不要。取り下げ済みは上流が 410 を返し、そのまま透過する。
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  try {
    const { id } = await params;

    const data = await fetchUpstream<DeckCodePostGetByIdResponseType>(
      upstreamUrl`/api/v1beta/deck_code_posts/${id}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...optionalAuthorizationHeader(session?.user.id),
        },
      },
    );

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}

// 取り下げ。投稿者本人だけが行える(上流で確認する)。
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    await fetchUpstream<unknown>(upstreamUrl`/api/v1beta/deck_code_posts/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + signUpstreamToken(session.user.id),
        Accept: "application/json",
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
