import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import { fetchRecordsPageWithDetails } from "@app/utils/recordListServer";
import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

import { RecordCreateRequestType, RecordCreateResponseType } from "@app/types/record";

/*
 * 記録一覧の1ページ。上流の生の一覧に加えて、次ページの有無(has_next)と各カードの周辺情報
 * (デッキ・イベント・対戦の集計 = details)を付けて返す。サーバ描画(records/page.tsx)と同じ
 * 組み立て(recordListServer)なので、初期表示とクライアントの取り直しで形が変わらない。
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const deckId = searchParams.get("deck_id") ?? "";
    const eventType = searchParams.get("event_type") ?? "";
    const cursor = searchParams.get("cursor") ?? "";

    const records = await fetchRecordsPageWithDetails(session.user.id, {
      eventType,
      deckId,
      cursor,
    });

    return NextResponse.json(records, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signUpstreamToken(session.user.id);

  try {
    const record: RecordCreateRequestType = await request.json();

    const created = await fetchUpstream<RecordCreateResponseType>(
      upstreamUrl`/api/v1beta/records`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(record),
      },
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
