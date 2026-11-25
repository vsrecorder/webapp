import { NextRequest, NextResponse } from "next/server";

import { upstreamErrorResponse } from "@app/utils/upstream";

import { isOfficialEventDateKey } from "@app/utils/officialEventList";
import { getOfficialEventList } from "@app/utils/officialEventListServer";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type_id = searchParams.get("type_id") ?? "";
    const league_type = searchParams.get("league_type") ?? "";
    const date = searchParams.get("date") ?? "";

    // 開催日として読めない値は上流へ送らない。入力欄は妥当な日付のときだけ引くようにしてあるが
    // (utils/officialEventList の isOfficialEventDateKey)、古い版の画面や直接の呼び出しでは届きうる。
    // 上流も 400 を返すので応答は同じで、往復だけを省く
    if (date !== "" && !isOfficialEventDateKey(date)) {
      return NextResponse.json({ error: "invalid date" }, { status: 400 });
    }

    const officialEvents = await getOfficialEventList(type_id, league_type, date);

    return NextResponse.json(officialEvents, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
