import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@app/auth";

import { RECORDING_DISMISSED_COOKIE } from "@app/utils/recordingNow";
import { getRecordingNow } from "@app/utils/recordingNowServer";
import { RecordingNowBarType } from "@app/types/recording_now";
import { EventKind } from "@app/components/molecules/EventIcon";

/*
 * いま記録中のイベント。画面下に常駐する「続きを記録」バーが使う。
 *
 * ホーム上部のカードと同じ getRecordingNow を通す。判定(今日のイベント・窓・閉じたか)を
 * 2か所に書くと、片方だけ条件が変わったときに「カードは出ているのにバーは出ない」が起きる。
 *
 * バーは全ページに出るので、レイアウトのサーバ側で取ると全ページのTTFBに往復が乗る
 * (実測で 50〜70ms。記録中でない人にも必ず掛かる)。ブラウザから叩いてもらい、
 * ページの表示自体は止めない。
 *
 * 返すのはバーに出すぶんだけ。記録の中身はここでは要らない(追記は記録詳細ページへ移って行う)。
 */
export async function GET() {
  const session = await auth();
  // 未ログインはエラーではなく「記録中ではない」。バーは何も出さない
  if (!session) return NextResponse.json({ recording: null }, { status: 200 });

  try {
    const store = await cookies();
    const dismissed = store.get(RECORDING_DISMISSED_COOKIE)?.value;

    const data = await getRecordingNow(session.user.id, dismissed);
    if (!data) return NextResponse.json({ recording: null }, { status: 200 });

    const record = data.record;
    // 記録は公式 / Tonamel / 自由形式のいずれか1つに紐づく
    const eventKind: EventKind =
      record.official_event_id !== 0
        ? "official"
        : record.tonamel_event_id !== ""
          ? "tonamel"
          : "unofficial";

    const recording: RecordingNowBarType = {
      recordId: record.id,
      eventTitle: data.eventTitle,
      eventIconUrl: data.eventIconUrl,
      eventKind,
      venue: data.venue,
      total: data.summary?.total ?? 0,
      wins: data.summary?.wins ?? 0,
      losses: data.summary?.losses ?? 0,
      draws: data.summary?.draws ?? 0,
      // 集計が取れなかったときは勝敗を出さない(0勝0敗と誤解させない)。カードと同じ扱い
      hasSummary: data.summary !== null,
      // 使用デッキはカード用に getRecordingNow が取り済み。ここでは詰め替えるだけで往復は増えない
      deck: data.deck ? { name: data.deck.name, pokemon_sprites: data.deck.pokemon_sprites } : null,
    };

    return NextResponse.json({ recording }, { status: 200 });
  } catch (error) {
    // 取れないことを理由にページを壊さない。バーが出ないだけにする
    console.error("failed to resolve the recording now bar", error);
    return NextResponse.json({ recording: null }, { status: 200 });
  }
}
