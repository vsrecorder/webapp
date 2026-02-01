import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/(default)/auth";

import { AcespecType } from "@app/types/acespec";

async function getAcespec(code: string) {
  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(`https://${domain}/api/v1beta/deckcards/${code}/acespec`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    /*
    if (res.status !== 200) {
      return NextResponse.json({ error: "" }, { status: res.status });
    }
    */

    const ret: AcespecType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { code } = await params;

    const ret = await getAcespec(code);

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}
