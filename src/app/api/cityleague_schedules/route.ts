import { NextRequest, NextResponse } from "next/server";

import {
  UpstreamError,
  fetchUpstream,
  upstreamErrorResponse,
  upstreamUrl,
} from "@app/utils/upstream";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  const url = date
    ? upstreamUrl`/api/v1beta/cityleague_schedules?date=${date}`
    : upstreamUrl`/api/v1beta/cityleague_schedules`;

  try {
    const data = await fetchUpstream(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    // 該当する開催予定が無いのは正常系。404を返すと呼び出し側の `!res.ok` が
    // 上流障害(5xx)と区別できず、正常な利用もアクセスログ上4xxとして残るため200で返す。
    // 日付指定時は単一オブジェクト、未指定時は配列という既存の契約に合わせる。
    if (error instanceof UpstreamError && error.status === 404) {
      return NextResponse.json(date ? null : [], { status: 200 });
    }

    return upstreamErrorResponse(error);
  }
}
