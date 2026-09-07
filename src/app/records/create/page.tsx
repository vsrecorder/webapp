import { auth } from "@app/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseDate } from "@internationalized/date";

import TemplateRecordCreate from "@app/components/templates/RecordCreate";
import { DeckGetAllType } from "@app/types/deck";
import { todayJSTDateString } from "@app/utils/date";
import { upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";
import { toRecordCreateOfficialEvent } from "@app/types/official_event";
import { toOfficialEventDateKey } from "@app/utils/officialEventList";
import { getOfficialEventList } from "@app/utils/officialEventListServer";
import {
  RECORD_CREATE_SELECTED_TAB_COOKIE,
  resolveRecordCreateTab,
} from "@app/utils/recordCreatePrefs";

type Props = {
  searchParams: Promise<{
    deck_id?: string;
    deck_code_id?: string;
    event_type?: string;
    // 公式イベントの指定(Myジムのイベント詳細などからの遷移)
    official_event_id?: string;
    event_date?: string;
  }>;
};

/*
 * 公式イベントを取りに行く開催日(YYYY-MM-DD)。
 *
 * クライアント側の初期値(RecordCreate の selectedDate)と同じ規則で決める。
 * 食い違うと SWR のキーが一致せず、先読みしたぶんが使われないまま
 * ブラウザから取り直しになる(表示は壊れない)。
 *
 * ここでの「今日」は JST。利用者の端末が別のタイムゾーンだと1日ずれることがあり、
 * そのときは先読みが空振りしてブラウザ側の取得に委ねられる。
 */
function initialOfficialEventDate(eventDate?: string): string {
  if (eventDate) {
    try {
      return toOfficialEventDateKey(parseDate(eventDate));
    } catch {
      // 日付として読めない指定は無視して今日を使う(クライアント側も同じ)
    }
  }

  return todayJSTDateString();
}

/*
 * 「使用デッキ」の選択肢。ブラウザから取りに行くと欄が後から現れる(ポップイン)ため、
 * 初回描画に間に合わせる。/records/quick の getDecks と同じ流儀。
 *
 * 一覧はトークンの uid 基準(要認証)のため、webapp の /api routes と同じ方式で
 * 短命 JWT を署名して呼ぶ。直前に作ったデッキを必ず含めたいのでキャッシュしない。
 * 失敗時は null を返し、クライアント側の取得に委ねる(「デッキ0件」と区別する)。
 */
async function getDecks(userId: string): Promise<DeckGetAllType | null> {
  const res = await fetch(upstreamUrl`/api/v1beta/decks/all`, {
    cache: "no-store",
    method: "GET",
    headers: {
      Authorization: "Bearer " + signUpstreamToken(userId),
      Accept: "application/json",
    },
  });

  if (res.status !== 200) return null;

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export default async function Page({ searchParams }: Props) {
  // searchParams は auth() と並行して解決してよい。直列にすると、開催日が決まるまで
  // 公式イベントの先読みを始められない
  const [session, { deck_id, deck_code_id, event_type, official_event_id, event_date }] =
    await Promise.all([auth(), searchParams]);

  if (!session) {
    redirect("/");
  }

  /*
   * 開くタブはここで確定させる。最後に選んだタブは cookie にあるので
   * サーバでも読める(recordCreatePrefs 参照)。
   *
   * 確定させることで、タブが決まるまでフォームを骨格で隠す必要が無くなり、
   * 公式イベントの候補を先読みするかどうかもここで判断できる。
   */
  const store = await cookies();
  const tab = resolveRecordCreateTab({
    officialEventId: official_event_id,
    eventType: event_type,
    savedTab: store.get(RECORD_CREATE_SELECTED_TAB_COOKIE)?.value,
  });

  /*
   * 公式イベントの候補をサーバ側で取ってから描く。
   *
   * ブラウザから取りに行くと「JSを落とす→ハイドレート→取得」が直列になる。
   * この一覧は土日で1,400件を超える大きさなので、その往復のぶんだけ
   * イベント欄が「検索中...」のまま待たされる。ここで取っておけば
   * JS のダウンロードと取得が並行に進む。
   *
   * 公式イベントタブで開くときだけ先読みする。Tonamel・自由形式のタブには
   * 公式イベントの選択欄が無い。本番のログ7日ぶんでは、作られた記録194件のうち
   * 65件(34%)が自由形式だった。
   *
   * 失敗しても描画は続ける(クライアント側の取得に委ねる)。
   */
  const officialEventDate = initialOfficialEventDate(event_date);

  // デッキ一覧はどのタブでも要る(使用デッキの欄は3タブ共通)。公式イベントとは
  // 別の上流なので、直列にせず並行して取る
  const [officialEvents, decks] = await Promise.all([
    tab === "official"
      ? getOfficialEventList("", "", officialEventDate)
          // フォームが使うフィールドだけを HTML に載せる(RecordCreateOfficialEventType 参照)
          .then((res) => res.official_events.map(toRecordCreateOfficialEvent))
          .catch(() => null)
      : null,
    getDecks(session.user.id).catch(() => null),
  ]);

  return (
    <>
      <TemplateRecordCreate
        deck_id={deck_id ? deck_id : ""}
        deck_code_id={deck_code_id ? deck_code_id : ""}
        tab={tab}
        official_event_id={official_event_id}
        event_date={event_date}
        initial_official_event_date={officialEventDate}
        initial_official_events={officialEvents ?? undefined}
        initial_decks={decks ?? undefined}
      />
    </>
  );
}
