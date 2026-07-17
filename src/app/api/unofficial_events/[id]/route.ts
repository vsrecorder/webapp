import { NextRequest, NextResponse } from "next/server";

import { UnofficialEventGetByIdResponseType } from "@app/types/unofficial_event";

import { upstreamUrl } from "@app/utils/upstream";

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
