import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

import {
  UnofficialEventCreateRequestType,
  UnofficialEventCreateResponseType,
} from "@app/types/unofficial_event";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signUpstreamToken(session.user.id);

  try {
    const unofficialEvent: UnofficialEventCreateRequestType = await request.json();

    const created = await fetchUpstream<UnofficialEventCreateResponseType>(
      upstreamUrl`/api/v1beta/unofficial_events`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(unofficialEvent),
      },
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
