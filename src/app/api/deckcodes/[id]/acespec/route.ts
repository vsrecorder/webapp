import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/(default)/auth";

import { AcespecType } from "@app/types/acespec";

async function getAcespec(code: string): Promise<AcespecType> {
  try {
    //const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(`https://vsrecorder.mobi/api/v1/deckcards/${code}/acespec`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const ret: AcespecType = await res.json();

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

    const ret = await getAcespec(id);

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}
