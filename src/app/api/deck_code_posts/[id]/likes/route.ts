import { NextRequest, NextResponse } from "next/server";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

import { DeckCodePostGetLikersResponseType } from "@app/types/deck_code_post";

// いいねした人の一覧。ログイン不要。
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { searchParams } = new URL(request.url);
  const query = new URLSearchParams();
  for (const key of ["limit", "offset"]) {
    const value = searchParams.get(key);
    if (value) query.set(key, value);
  }

  try {
    const { id } = await params;

    const data = await fetchUpstream<DeckCodePostGetLikersResponseType>(
      upstreamUrl`/api/v1beta/deck_code_posts/${id}/likes?${query}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
