import { NextResponse } from "next/server";

import { StandardRegulationType } from "@app/types/standard_regulation";

export async function GET() {
  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(`https://${domain}/api/v1beta/standard_regulations`, {
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
