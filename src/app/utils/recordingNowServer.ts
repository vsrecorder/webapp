import { cache } from "react";

import {
  cleanOfficialEventTitle,
  getEventIconUrl,
  getEventVenueLabel,
} from "@app/components/organisms/Record/officialEventHelpers";

import { MatchSummariesGetResponseType, MatchSummaryType } from "@app/types/match";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";
import {
  RecordCardDeckType,
  RecordGetByIdResponseType,
  RecordGetResponseType,
  RecordType,
} from "@app/types/record";
import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";
import { UnofficialEventGetByIdResponseType } from "@app/types/unofficial_event";
import { DeckGetByIdResponseType } from "@app/types/deck";
import { todayJSTDateString } from "@app/utils/date";
import {
  isRecordingDismissed,
  isWithinRecordingWindow,
  pickTodaysRecord,
  recordingActivityOf,
} from "@app/utils/recordingNow";
import { fetchUpstream, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

/*
 * ホームの「記録中のイベント」カードに出すデータを、サーバ側で組み立てる。
 * 判定そのもの(何を記録中と見なすか)は utils/recordingNow にある。
 */

/*
 * ホームが最初に見る記録一覧の件数。
 *
 * 「記録0件か」「3件未満か」の判定(CTA・環境ウィンドウ)と、「記録中」カードの候補探しが
 * この同じ応答を使う。React の cache で1リクエスト1回に畳まれるので往復は増えない。
 *
 * 3 ではなく 5 なのは、大会の予定を先に作る人がいるため。一覧は event_date DESC で
 * 返るので、未来日の記録が3件並ぶと今日の記録が窓から押し出されてしまう。
 */
export const HOME_RECORDS_HEAD_LIMIT = 5;

// 周辺情報1本の上限。ここで固まるとホームの応答ごと遅れるので、諦めてカードを出さない
const DETAIL_TIMEOUT_MS = 2500;

export type RecordingNowType = {
  // 対戦追加モーダルへそのまま渡すので、記録は生の形で持つ
  record: RecordGetByIdResponseType;
  // イベント名(公式 / Tonamel / 自由形式のどれか)。取れなければ空文字
  eventTitle: string;
  // イベントのアイコン画像(公式イベントのみ)。Tonamel と自由形式は種別が決まれば
  // 描けるので、対戦記録カードと同じくカード側で描く
  eventIconUrl: string | null;
  // 会場(公式イベントのみ)。店舗名、無ければ会場名。どちらも無ければ空文字
  venue: string;
  // 使用デッキ。未登録・取得失敗なら null
  deck: RecordCardDeckType | null;
  // 現在の戦績。取得できなければ null(カードは勝敗を出さない)
  summary: MatchSummaryType | null;
  // 最後に手が動いた時刻(ISO文字列)。「最後の記録から◯分」の表示に使う
  lastActiveAt: string;
  // その起点から数える窓の長さ(ミリ秒)。対戦0件か否かで変わる(utils/recordingNow)
  windowMs: number;
};

function authHeaders(userId: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: "Bearer " + signUpstreamToken(userId),
  };
}

// 取れなければ null(ログだけ残す)。周辺情報の失敗でカードごと消さない
async function getOptional<T>(label: string, url: string, headers: HeadersInit): Promise<T | null> {
  try {
    return await fetchUpstream<T>(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(DETAIL_TIMEOUT_MS),
    });
  } catch (error) {
    console.error(`failed to fetch ${label} for the recording now card`, error);
    return null;
  }
}

/*
 * 記録一覧の先頭を取る。
 *
 * 一覧はトークンの uid 基準(要認証)のため、webapp の /api routes と同じ方式で
 * 短命 JWT を署名して呼ぶ。直前に作った記録も必ず含めたいのでキャッシュしない。
 * 失敗時は null を返し、呼び出し側が「判定できない」として扱う。
 *
 * 同じリクエスト内で二度呼ばれても1回で済ませる(記録件数の判定と「記録中」カードが共有する)。
 */
export const getHomeRecordsHead = cache(
  async (userId: string): Promise<RecordType[] | null> => {
    const res = await fetch(
      upstreamUrl`/api/v1beta/records?limit=${HOME_RECORDS_HEAD_LIMIT}`,
      {
        cache: "no-store",
        method: "GET",
        headers: authHeaders(userId),
      },
    );

    if (res.status !== 200) return null;

    const data: RecordGetResponseType = await res.json();
    return Array.isArray(data?.records) ? data.records : null;
  },
);

// 記録1件ぶんの対戦集計。一括取得のエンドポイントへ1件だけ渡す
async function fetchSummary(
  userId: string,
  recordId: string,
): Promise<MatchSummaryType | null> {
  const query = new URLSearchParams({ record_ids: recordId });
  const res = await getOptional<MatchSummariesGetResponseType>(
    "match summary",
    upstreamUrl`/api/v1beta/matches/summary?${query}`,
    authHeaders(userId),
  );

  if (!Array.isArray(res?.summaries)) return null;

  return res.summaries.find((summary) => summary.record_id === recordId) ?? null;
}

type EventInfo = Pick<RecordingNowType, "eventTitle" | "eventIconUrl" | "venue">;

const NO_EVENT: EventInfo = { eventTitle: "", eventIconUrl: null, venue: "" };

/*
 * イベントの名前・アイコン・会場。記録は公式 / Tonamel / 自由形式のいずれか1つに紐づく。
 *
 * 公式イベントのタイトルは、そのままだと「【26/9】ポケモンカードジム　ジムバトル」のように
 * 店舗名の接頭辞やリーグの注記を抱えている。対戦記録カードをはじめ表示する面はすべて
 * cleanOfficialEventTitle を通して「ジムバトル」に整えているので、ここでも同じに揃える。
 *
 * アイコンと会場も対戦記録カードに合わせる。会場を持つのは公式イベントだけで、
 * Tonamel と自由形式はカード側でもアイコン(Tマーク / 鉛筆)以外は出さない。
 */
async function fetchEventInfo(
  userId: string,
  record: RecordGetByIdResponseType,
): Promise<EventInfo> {
  const headers = authHeaders(userId);

  if (record.official_event_id !== 0) {
    const event = await getOptional<OfficialEventGetByIdResponseType>(
      "official event",
      upstreamUrl`/api/v1beta/official_events/${record.official_event_id}`,
      headers,
    );
    if (!event) return NO_EVENT;

    return {
      eventTitle: cleanOfficialEventTitle(event.title),
      eventIconUrl: getEventIconUrl(event),
      venue: getEventVenueLabel(event),
    };
  }

  if (record.tonamel_event_id !== "") {
    const event = await getOptional<TonamelEventGetByIdResponseType>(
      "tonamel event",
      upstreamUrl`/api/v1beta/tonamel_events/${record.tonamel_event_id}`,
      headers,
    );
    return { ...NO_EVENT, eventTitle: event?.title ?? "" };
  }

  if (record.unofficial_event_id !== "") {
    const event = await getOptional<UnofficialEventGetByIdResponseType>(
      "unofficial event",
      upstreamUrl`/api/v1beta/unofficial_events/${record.unofficial_event_id}`,
      headers,
    );
    return { ...NO_EVENT, eventTitle: event?.title ?? "" };
  }

  return NO_EVENT;
}

// カードに出すぶんだけに絞る(名前とスプライト)
async function fetchCardDeck(
  userId: string,
  deckId: string,
): Promise<RecordCardDeckType | null> {
  if (!deckId) return null;

  const deck = await getOptional<DeckGetByIdResponseType>(
    "deck",
    upstreamUrl`/api/v1beta/decks/${deckId}`,
    authHeaders(userId),
  );

  if (!deck) return null;

  return { id: deck.id, name: deck.name, pokemon_sprites: deck.pokemon_sprites ?? [] };
}

/*
 * いま記録中のイベントを1件返す。条件に合うものが無ければ null。
 *
 * まず一覧の先頭から今日の記録を探し、閉じられていないかを見る。ここまでは往復を伴わない
 * (一覧は記録件数の判定と共有される)ので、大半のユーザーはここで抜ける。
 *
 * 候補があったときだけ、窓の判定に要る集計と、カードに出すイベント・デッキを
 * まとめて取りに行く。集計を待ってから周辺情報を取れば窓の外だったぶんの往復を
 * 節約できるが、それだと3段の直列になりホームの応答(TTFB)にそのまま積み上がる。
 * 候補を持つのは「今日のイベントの記録がある人」だけで、そのほとんどは窓の内側にいる
 * (作った直後か、対戦を入れている最中)ため、1段減らすほうが効く。
 *
 * dismissed は「記録を終える」で書かれた cookie の値(サーバ側で読んで渡す)。
 */
export async function getRecordingNow(
  userId: string,
  dismissed: string | null | undefined,
): Promise<RecordingNowType | null> {
  const records = await getHomeRecordsHead(userId);
  if (!records) return null;

  const today = todayJSTDateString();

  const candidate = pickTodaysRecord(records, today);
  if (!candidate) return null;
  if (isRecordingDismissed(dismissed, candidate.data.id, today)) return null;

  const [summary, event, deck] = await Promise.all([
    fetchSummary(userId, candidate.data.id),
    fetchEventInfo(userId, candidate.data),
    fetchCardDeck(userId, candidate.data.deck_id),
  ]);

  const { lastActiveAt, windowMs } = recordingActivityOf(candidate, summary);
  if (!isWithinRecordingWindow(lastActiveAt, windowMs)) return null;

  return {
    record: candidate.data,
    ...event,
    deck,
    summary,
    // isWithinRecordingWindow を通っているので null ではない
    lastActiveAt: lastActiveAt as string,
    windowMs,
  };
}
