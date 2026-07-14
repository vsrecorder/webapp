import { NextResponse, NextRequest } from "next/server";

import { fetchUpstream, upstreamErrorResponse } from "@app/utils/upstream";

import { EnvironmentType } from "@app/types/environment";

async function getEnvironment(date: string): Promise<EnvironmentType> {
  const domain = process.env.VSRECORDER_DOMAIN;

  return await fetchUpstream<EnvironmentType>(
    `https://${domain}/api/v1beta/environments?date=${date}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );
}

// date未指定時は環境一覧をまとめて返す（環境フィルタのセレクタ選択肢取得用）
async function getAllEnvironments(): Promise<EnvironmentType[]> {
  const domain = process.env.VSRECORDER_DOMAIN;

  return await fetchUpstream<EnvironmentType[]>(
    `https://${domain}/api/v1beta/environments`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") ?? "";

    if (!date) {
      const environments = await getAllEnvironments();

      return NextResponse.json(environments, { status: 200 });
    }

    const environment = await getEnvironment(date);

    return NextResponse.json(environment, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
