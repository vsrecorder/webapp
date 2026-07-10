import { NextResponse, NextRequest } from "next/server";

import { EnvironmentType } from "@app/types/environment";

async function getEnvironment(date: string): Promise<EnvironmentType> {
  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(`https://${domain}/api/v1beta/environments?date=${date}`, {
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

// date未指定時は環境一覧をまとめて返す（環境フィルタのセレクタ選択肢取得用）
async function getAllEnvironments(): Promise<EnvironmentType[]> {
  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(`https://${domain}/api/v1beta/environments`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) return [];

    const ret: EnvironmentType[] = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") ?? "";

    if (!date) {
      const ret = await getAllEnvironments();
      return NextResponse.json(ret, { status: 200 });
    }

    const ret = await getEnvironment(date);

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}
