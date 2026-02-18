import { NextResponse, NextRequest } from "next/server";

import { EnvironmentType } from "@app/types/environment";

async function getEnvironmentById(id: string): Promise<EnvironmentType> {
  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(`https://${domain}/api/v1beta/environments/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const ret: EnvironmentType = await res.json();

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

    const ret = await getEnvironmentById(id);

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}
