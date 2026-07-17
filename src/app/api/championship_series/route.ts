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

    if (res.status === 404) {
      return NextResponse.json({ message: "not found" }, { status: 404 });
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
