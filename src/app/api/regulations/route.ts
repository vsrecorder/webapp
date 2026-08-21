import { NextResponse } from "next/server";

import { RegulationType } from "@app/types/regulation";

import { upstreamUrl } from "@app/utils/upstream";

export async function GET() {
  try {
    const res = await fetch(upstreamUrl`/api/v1beta/regulations`, {
      cache: "no-store",
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json({ message: "error" }, { status: res.status });
    }

    const data: RegulationType[] = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ message: "internal server error" }, { status: 500 });
  }
}
