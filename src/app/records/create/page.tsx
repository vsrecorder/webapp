import { auth } from "@app/auth";
import { redirect } from "next/navigation";
import { parseDate } from "@internationalized/date";

import TemplateRecordCreate from "@app/components/templates/RecordCreate";
import { todayJSTDateString } from "@app/utils/date";
import { toOfficialEventDateKey } from "@app/utils/officialEventList";
import { getOfficialEventList } from "@app/utils/officialEventListServer";

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

export default async function Page({ searchParams }: Props) {
  // searchParams は auth() と並行して解決してよい。直列にすると、開催日が決まるまで
  // 公式イベントの先読みを始められない
  const [session, { deck_id, deck_code_id, event_type, official_event_id, event_date }] =
    await Promise.all([auth(), searchParams]);

  if (!session) {
    redirect("/");
  }

  // event_type が明示指定されていない場合は undefined を渡し、
  // クライアント側でセッション内の最終選択タブを復元できるようにする。
  // ただし公式イベントの指定がある遷移は、そのイベントを選ばせるのが目的なので
  // event_type の有無にかかわらず公式イベントタブで開く。
  const tab = official_event_id
    ? "official"
    : event_type === "official" ||
        event_type === "tonamel" ||
        event_type === "unofficial"
      ? event_type
      : undefined;

  /*
   * 公式イベントの候補をサーバ側で取ってから描く。
   *
   * ブラウザから取りに行くと「JSを落とす→ハイドレート→取得」が直列になる。
   * この一覧は土日で1,400件を超える大きさなので、その往復のぶんだけ
   * イベント欄が「検索中...」のまま待たされる。ここで取っておけば
   * JS のダウンロードと取得が並行に進む。
   *
   * 公式イベントタブで開くときだけ先読みする。Tonamel・自由形式が名指しされた
   * 遷移では、その画面に公式イベントの選択欄が無い。
   *
   * 失敗しても描画は続ける(クライアント側の取得に委ねる)。
   */
  const officialEventDate = initialOfficialEventDate(event_date);
  const officialEvents =
    tab === "tonamel" || tab === "unofficial"
      ? null
      : await getOfficialEventList("", "", officialEventDate)
          .then((res) => res.official_events)
          .catch(() => null);

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
      />
    </>
  );
}
