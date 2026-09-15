import { NextRequest, NextResponse } from "next/server";

import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";

import { upstreamUrl } from "@app/utils/upstream";

/*
 * Tonamel のイベント情報を引く中継。
 *
 * 見つからない(404)はそのまま 404 で返す。入力欄は1文字ごとにここを叩いて有効性を見ており、
 * 打ち間違いや入力途中は「見つからない」になるのが普通だから。以前はどの失敗も例外にして
 * 500 を返していたため、利用者が ID を打ち直しただけでサーバエラーとして記録されていた
 * (実測: ある日の 500 は22件すべてこれで、内訳はデッキコードの貼り間違いと、その削除途中だった)。
 *
 * 上流が落ちている等の想定外の失敗は 502 にして、見つからないのと区別できるようにする。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let res: Response;
  try {
    res = await fetch(upstreamUrl`/api/v1beta/tonamel_events/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
  } catch {
    // 上流へ届かなかった(ネットワーク・タイムアウト)
    return NextResponse.json({ error: "bad gateway" }, { status: 502 });
  }

  if (res.status === 404) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: "bad gateway" }, { status: 502 });
  }

  const ret: TonamelEventGetByIdResponseType = await res.json();

  return NextResponse.json(ret, { status: 200 });
}
