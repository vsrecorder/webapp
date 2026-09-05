import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { optionalAuthorizationHeader } from "@app/utils/upstreamToken";

import { DeckCodePostGetByUserIdResponseType } from "@app/types/deck_code_post";

// 投稿者ページ(公開中の投稿と集計)。ログイン不要。
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  const { searchParams } = new URL(request.url);
  const query = new URLSearchParams();
  for (const key of ["limit", "offset"]) {
    const value = searchParams.get(key);
    if (value) query.set(key, value);
  }

  try {
    const { id } = await params;

    const data = await fetchUpstream<DeckCodePostGetByUserIdResponseType>(
      upstreamUrl`/api/v1beta/users/${id}/deck_code_posts?${query}`,
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
