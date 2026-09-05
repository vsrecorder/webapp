import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

// 「取り込む」が使われた回数を数える(運営の指標)。取り込み自体はデッキ作成APIが行う。
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    await fetchUpstream<unknown>(upstreamUrl`/api/v1beta/deck_code_posts/${id}/import`, {
      method: "POST",
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
