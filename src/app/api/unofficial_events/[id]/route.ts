import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import {
  UnofficialEventGetByIdResponseType,
  UnofficialEventUpdateRequestType,
  UnofficialEventUpdateResponseType,
} from "@app/types/unofficial_event";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

async function getUnofficialEventById(
  id: string,
): Promise<UnofficialEventGetByIdResponseType> {
  try {
    const res = await fetch(upstreamUrl`/api/v1beta/unofficial_events/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const ret = await res.json();
      throw new Error(`HTTP error: ${res.status} Message: ${ret.message}`);
    }

    const ret: UnofficialEventGetByIdResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const ret = await getUnofficialEventById(id);

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}

export async function PUT(
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
    const unofficialEvent: UnofficialEventUpdateRequestType = await request.json();

    const updated = await fetchUpstream<UnofficialEventUpdateResponseType>(
      upstreamUrl`/api/v1beta/unofficial_events/${id}`,
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(unofficialEvent),
      },
    );

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}

export async function DELETE(
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

    await fetchUpstream<null>(upstreamUrl`/api/v1beta/unofficial_events/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
