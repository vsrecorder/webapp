import { NextResponse } from "next/server";

import { StandardRegulationType } from "@app/types/standard_regulation";

import { upstreamUrl } from "@app/utils/upstream";

export async function GET() {
  try {
    const res = await fetch(upstreamUrl`/api/v1beta/standard_regulations`, {
      cache: "no-store",
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json({ message: "error" }, { status: res.status });
    }

    const data: StandardRegulationType[] = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ message: "internal server error" }, { status: 500 });
  }
}
