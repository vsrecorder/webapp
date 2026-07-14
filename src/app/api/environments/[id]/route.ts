import { NextResponse, NextRequest } from "next/server";

import { fetchUpstream, upstreamErrorResponse } from "@app/utils/upstream";

import { EnvironmentType } from "@app/types/environment";

async function getEnvironmentById(id: string): Promise<EnvironmentType> {
  const domain = process.env.VSRECORDER_DOMAIN;

  return await fetchUpstream<EnvironmentType>(
    `https://${domain}/api/v1beta/environments/${id}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const environment = await getEnvironmentById(id);

    return NextResponse.json(environment, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
