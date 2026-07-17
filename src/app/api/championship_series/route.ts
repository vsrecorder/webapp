import { NextRequest, NextResponse } from "next/server";

import { upstreamUrl } from "@app/utils/upstream";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    const url = date
      ? upstreamUrl`/api/v1beta/championship_series?date=${date}`
      : upstreamUrl`/api/v1beta/championship_series`;

    const res = await fetch(url, {
      cache: "no-store",
      method: "GET",
      headers: { Accept: "application/json" },
    });

    // 該当する開催予定が無いのは正常系。404を返すと呼び出し側の `!res.ok` が
    // 上流障害(5xx)と区別できず、正常な利用もアクセスログ上4xxとして残るため200で返す。
    // 日付指定時は単一オブジェクト、未指定時は配列という既存の契約に合わせる。
    if (res.status === 404) {
      return NextResponse.json(date ? null : [], { status: 200 });
    }
    if (!res.ok) {
      return NextResponse.json({ message: "error" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ message: "internal server error" }, { status: 500 });
  }
}
