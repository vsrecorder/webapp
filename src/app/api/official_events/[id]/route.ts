import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/(default)/auth";

import { OfficialEventGetByIdResponseType } from "@app/types/official_event";

async function getOfficialEventById(
  id: string,
): Promise<OfficialEventGetByIdResponseType> {
  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(`https://${domain}/api/v1beta/official_events/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const ret: OfficialEventGetByIdResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const ret = await getOfficialEventById(id);

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}
