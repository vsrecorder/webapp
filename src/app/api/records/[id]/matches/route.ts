import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

import { MatchGetResponseType } from "@app/types/match";

async function getMatches(
  token: string,
  record_id: string,
): Promise<MatchGetResponseType[]> {
  return await fetchUpstream<MatchGetResponseType[]>(
    upstreamUrl`/api/v1beta/records/${record_id}/matches`,
    {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
    },
  );
}

export async function GET(
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
    const record_id = id;

    const matches = await getMatches(token, record_id);

    return NextResponse.json(matches, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
