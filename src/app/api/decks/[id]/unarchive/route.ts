import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

import { DeckUnarchiveResponse } from "@app/types/deck";

async function unarchiveDeckById(
  token: string,
  id: string,
): Promise<DeckUnarchiveResponse> {
  return await fetchUpstream<DeckUnarchiveResponse>(
    upstreamUrl`/api/v1beta/decks/${id}/unarchive`,
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

    const unarchived = await unarchiveDeckById(token, id);

    return NextResponse.json(unarchived, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
