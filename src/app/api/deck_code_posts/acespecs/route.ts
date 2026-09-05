import { NextRequest, NextResponse } from "next/server";

import { DeckCodePostGetAceSpecsResponseType } from "@app/types/deck_code_post";
import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

// ACE SPEC での絞り込み候補(環境内の公開中の投稿で使われている ACE SPEC と投稿数)。
// 一覧と同じくログイン不要。
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams();
  const environmentId = searchParams.get("environment_id");
  if (environmentId) params.set("environment_id", environmentId);

  try {
    const data = await fetchUpstream<DeckCodePostGetAceSpecsResponseType>(
      upstreamUrl`/api/v1beta/deck_code_posts/acespecs?${params}`,
      { method: "GET", headers: { Accept: "application/json" } },
    );

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
