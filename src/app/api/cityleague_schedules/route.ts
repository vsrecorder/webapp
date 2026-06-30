import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const domain = process.env.VSRECORDER_DOMAIN;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    const url = date
      ? `https://${domain}/api/v1beta/cityleague_schedules?date=${date}`
      : `https://${domain}/api/v1beta/cityleague_schedules`;

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
