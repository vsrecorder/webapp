import { NextResponse, NextRequest } from "next/server";

import { DeckCardType } from "@app/types/deckcard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(`https://${domain}/api/v1beta/deckcards/${code}/list`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    // 上流の失敗ボディを200で返してしまうと、呼び出し側は成功と誤認し、
    // 配列ではないJSONをそのままレンダリングして例外になる。
    // 失敗は失敗として、上流のステータスのまま返す。
    if (!res.ok) {
      return NextResponse.json(
        { error: "failed to fetch deck card list" },
        { status: res.status },
      );
    }

    const cards: DeckCardType[] = await res.json();

    return NextResponse.json(cards, { status: 200 });
  } catch (error) {
    throw error;
  }
}
