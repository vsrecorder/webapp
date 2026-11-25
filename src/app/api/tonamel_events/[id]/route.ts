import { NextRequest, NextResponse } from "next/server";

import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";

import { isTonamelEventIdFormat } from "@app/utils/tonamelEvent";
import { UpstreamError, fetchUpstream, upstreamUrl } from "@app/utils/upstream";

/*
 * Tonamel のイベント情報を引く中継。
 *
 * 見つからない(404)はそのまま 404 で返す。入力欄は1文字ごとにここを叩いて有効性を見ており、
 * 打ち間違いや入力途中は「見つからない」になるのが普通だから。以前はどの失敗も例外にして
 * 500 を返していたため、利用者が ID を打ち直しただけでサーバエラーとして記録されていた
 * (実測: ある日の 500 は22件すべてこれで、内訳はデッキコードの貼り間違いと、その削除途中だった)。
 *
 * IDの形が違う(400)も、見つからないのと同じく入力の問題なので 400 で返す。以前は上流の 400 を
 * 502 にしていたため、日本語入力の変換前の1文字を打っただけで「上流の失敗」として記録されていた。
 * 形が違うと分かるものは上流へ送らない。
 *
 * 上流が落ちている等の想定外の失敗は 502 にして、見つからないのと区別できるようにする
 * (入力欄は 404・400 を「無効なイベントID」、それ以外を「確認できなかった」と出し分ける)。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isTonamelEventIdFormat(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  try {
    const ret = await fetchUpstream<TonamelEventGetByIdResponseType>(
      upstreamUrl`/api/v1beta/tonamel_events/${id}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    if (error instanceof UpstreamError && error.status === 404) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    // ここの形式の確認を通ったIDを上流が断った場合(双方の規則がずれたとき)
    if (error instanceof UpstreamError && error.status === 400) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    // 上流が失敗した(5xx・デプロイ中のHTML応答)か、そもそも届かなかった
    // (ネットワーク・タイムアウト)。どちらも「見つからない」と区別する。
    return NextResponse.json({ error: "bad gateway" }, { status: 502 });
  }
}
