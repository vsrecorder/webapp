"use client";

import useSWR from "swr";

import { RecordingNowGetResponseType } from "@app/types/recording_now";
import { todayJSTDateString } from "@app/utils/date";
import { RECORDING_NOW_SWR_KEY } from "@app/utils/recordingNowClient";

/*
 * いま記録中のイベント(/api/recording_now)。画面下のバーとホームのカードが同じ結果を共有する。
 *
 * 記録中かどうか(開催日が今日か)はサーバの時計で決めてある。ブラウザ側は端末の時計で
 * 開催日と比べ直さない(時計が日付単位でずれた端末で、記録中なのに出なくなるため)。
 * 代わりに、取得したときの端末の日付を添えておき、それと今の日付が違えば
 * 「昨日の答え」として扱う(isFetchedOnAnotherDay)。
 *
 * 起点を「描いたとき」ではなく「取得したとき」にしているのは、SWR が結果を持ち続けるため。
 * 0時前に取った結果で0時過ぎに描き直す(バーの付け直し・ブラウザの戻る)と、描いたときを
 * 起点にした判定では昨日の記録が今日のものとして出てしまう。
 */
export type RecordingNowSnapshot = RecordingNowGetResponseType & {
  // 取得したときの端末の日付(JST の "YYYY-MM-DD")
  fetchedDay: string;
  /*
   * 取得した時刻(端末の時計)。中身が同じでも取得ごとに別の値になる。
   * SWR は中身の等しい結果を同じ参照のまま返すので、これが無いと「表示を始めたあとに
   * 取り直したか」を参照の違いで見分けられない(RecordingNowCard)。
   */
  fetchedAt: number;
};

// 取得の間引き。ページを移るたびに投げ直さない
const DEDUPING_INTERVAL_MS = 60 * 1000;

async function fetcher(url: string): Promise<RecordingNowSnapshot> {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) throw new Error("Failed to fetch");

  const body: RecordingNowGetResponseType = await res.json();
  return { ...body, fetchedDay: todayJSTDateString(), fetchedAt: Date.now() };
}

export function useRecordingNow() {
  return useSWR<RecordingNowSnapshot, Error>(RECORDING_NOW_SWR_KEY, fetcher, {
    dedupingInterval: DEDUPING_INTERVAL_MS,
  });
}

/*
 * 取得したのが今日(端末の日付)と別の日か。today が空文字(サーバ描画・ハイドレーション中で
 * 端末の日付をまだ読んでいない)なら false。
 */
export function isFetchedOnAnotherDay(
  snapshot: RecordingNowSnapshot,
  today: string,
): boolean {
  return today !== "" && snapshot.fetchedDay !== today;
}
