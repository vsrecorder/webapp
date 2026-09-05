import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

import { DeckUnfavoriteResponse } from "@app/types/deck";

async function unfavoriteDeckById(
  token: string,
  id: string,
): Promise<DeckUnfavoriteResponse> {
  return await fetchUpstream<DeckUnfavoriteResponse>(
    upstreamUrl`/api/v1beta/decks/${id}/unfavorite`,
    {
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
    },
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signUpstreamToken(session.user.id);

  try {
    const { id } = await params;

    const unfavorited = await unfavoriteDeckById(token, id);

    return NextResponse.json(unfavorited, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
