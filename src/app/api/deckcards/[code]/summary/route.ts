import { NextResponse, NextRequest } from "next/server";

import { DeckCardSummaryType } from "@app/types/deckcard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(`https://${domain}/api/v1beta/deckcards/${code}/summary`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    // 上流の失敗ボディを200で返してしまうと、呼び出し側は成功と誤認し、
    // カードの配列が入っていないJSONをそのままレンダリングして例外になる。
    // 失敗は失敗として、上流のステータスのまま返す。
    if (!res.ok) {
      return NextResponse.json(
        { error: "failed to fetch deck card summary" },
        { status: res.status },
      );
    }

    const summary: DeckCardSummaryType = await res.json();

    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    throw error;
  }
}
