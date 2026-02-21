import { NextRequest, NextResponse } from "next/server";

import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";

async function getTonamelEventById(id: string): Promise<TonamelEventGetByIdResponseType> {
  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(`https://${domain}/api/v1beta/tonamel_events/${id}`, {
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

    const ret: TonamelEventGetByIdResponseType = await res.json();

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

    const ret = await getTonamelEventById(id);

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}
