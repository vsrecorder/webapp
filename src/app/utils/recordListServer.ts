import { cache } from "react";

import { DeckGetByIdResponseType } from "@app/types/deck";
import {
  MatchGetResponseType,
  MatchSummariesGetResponseType,
  MatchSummaryType,
} from "@app/types/match";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";
import { RecordCardDeckType, RecordGetResponseType } from "@app/types/record";
import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";
import { UnofficialEventGetByIdResponseType } from "@app/types/unofficial_event";
import { summarizeMatches } from "@app/utils/match";
import {
  RECORD_PAGE_LIMIT,
  attachRecordCardDetails,
  collectRecordCardIds,
  toRecordPage,
} from "@app/utils/recordListPage";
import { RecordsTab, recordsTabToEventType } from "@app/utils/recordListPrefs";
import { fetchUpstream, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

/*
 * 記録一覧の1ページを、カードの描画に要る周辺情報(デッキ・イベント・対戦の集計)ごと
 * サーバ側で組み立てる。BFF(/api/records)とサーバ描画(records/page.tsx)の両方がこれを使う。
 *
 * 以前はカードごとにブラウザから3本(イベント・デッキ・対戦)取っていた。本番の nginx ログでは
 * 記録一覧1回あたりカード単位の呼び出しが13〜14本走り、BFF 経由の1本は p50 200ms 超
 * (上流本体は 7〜9ms。差は Node 側の混雑と接続の張り直し)。ここで上流へ並列に取れば、
 * ブラウザからの往復は一覧の1本で済み、上流の1本は数 ms〜数十 ms なので
 * 一覧の応答が遅れるのはその程度で収まる。
 *
 * 周辺情報のどれかが取れなくても一覧は返す(その項目は付けず、カードが従来どおり自分で取る)。
 */

// 周辺情報1本の上限。上流は p90 でも 30ms 台だが、Tonamel は初回だけ外部サイトへ取りに行く。
// ここで固まると一覧ごと遅れるので、遅いものは諦めてカードに任せる
const DETAIL_TIMEOUT_MS = 2500;

function authHeaders(token: string): HeadersInit {
  return { Accept: "application/json", Authorization: "Bearer " + token };
}

// 取れなければ null(ログだけ残す)。一覧本体と違い、周辺情報の失敗で全体を失敗にしない
async function getOptional<T>(label: string, url: string, headers: HeadersInit): Promise<T | null> {
  try {
    return await fetchUpstream<T>(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(DETAIL_TIMEOUT_MS),
    });
  } catch (error) {
    console.error(`failed to fetch ${label} for the records page`, error);
    return null;
  }
}

// ID ごとに取って Map にする(取れなかったものは入れない)
async function fetchMap<K, T>(
  ids: K[],
  fetchOne: (id: K) => Promise<T | null>,
): Promise<Map<K, T>> {
  const results = await Promise.all(ids.map((id) => fetchOne(id)));
  const map = new Map<K, T>();
  results.forEach((result, index) => {
    if (result) map.set(ids[index], result);
  });
  return map;
}

/*
 * 1ページぶんの記録の対戦集計を、上流の一括取得で1回に済ませる。
 *
 * 以前は記録ごとに /records/:id/matches を呼んでいたので、1ページ(10件)で10本の
 * 上流呼び出しになっていた。上流に /matches/summary(record_ids をまとめて渡す)を
 * 足したのでそれを使う。応答に無い記録は「自分のものでない/存在しない」を意味する。
 *
 * 上流がまだ古くてこのエンドポイントが無い場合(デプロイの順序で起こりうる)は
 * null を返し、呼び出し側が従来どおり記録ごとに取り直す。
 */
async function fetchMatchSummaries(
  recordIds: string[],
  headers: HeadersInit,
): Promise<Map<string, MatchSummaryType> | null> {
  if (recordIds.length === 0) return new Map();

  try {
    const query = new URLSearchParams({ record_ids: recordIds.join(",") });
    const res = await fetchUpstream<MatchSummariesGetResponseType>(
      upstreamUrl`/api/v1beta/matches/summary?${query}`,
      { method: "GET", headers, signal: AbortSignal.timeout(DETAIL_TIMEOUT_MS) },
    );

    if (!Array.isArray(res?.summaries)) return null;

    return new Map(res.summaries.map((summary) => [summary.record_id, summary]));
  } catch (error) {
    console.error("failed to fetch match summaries for the records page", error);
    return null;
  }
}

// カードに要るデッキの項目だけに絞る(一覧の応答を無駄に大きくしない)
function toCardDeck(deck: DeckGetByIdResponseType): RecordCardDeckType {
  return { id: deck.id, name: deck.name, pokemon_sprites: deck.pokemon_sprites ?? [] };
}

export type RecordPageQuery = {
  // 記録の種別。空文字なら全種別
  eventType: string;
  // デッキで絞る(デッキの記録一覧モーダル)。空文字なら絞らない
  deckId: string;
  cursor: string;
};

/*
 * 1ページ(limit+1 件で取って limit 件 + has_next に整える)と、その記録の周辺情報を取る。
 * 一覧本体の失敗はそのまま投げる(BFF は上流のステータスで返す。ページはクライアントに任せる)。
 */
export async function fetchRecordsPageWithDetails(
  userId: string,
  { eventType, deckId, cursor }: RecordPageQuery,
): Promise<RecordGetResponseType> {
  const headers = authHeaders(signUpstreamToken(userId));

  const fetched = await fetchUpstream<RecordGetResponseType>(
    upstreamUrl`/api/v1beta/records?limit=${RECORD_PAGE_LIMIT + 1}&event_type=${eventType}&deck_id=${deckId}&cursor=${cursor}`,
    { method: "GET", headers },
  );

  // 想定外の形(records が配列でない)は整えずに返し、クライアント側の検査(取得失敗扱い)に任せる
  if (!Array.isArray(fetched?.records)) return fetched;

  const page = toRecordPage(fetched);
  const ids = collectRecordCardIds(page.records);

  // 周辺情報のトークンは別に切る。一覧本体が遅れても 10 秒の期限に掛からないように
  const detailHeaders = authHeaders(signUpstreamToken(userId));

  const [decks, officialEvents, tonamelEvents, unofficialEvents, matches] = await Promise.all([
    fetchMap(ids.deckIds, async (id) => {
      const deck = await getOptional<DeckGetByIdResponseType>(
        "deck",
        upstreamUrl`/api/v1beta/decks/${id}`,
        detailHeaders,
      );
      return deck ? toCardDeck(deck) : null;
    }),
    fetchMap(ids.officialEventIds, (id) =>
      getOptional<OfficialEventGetByIdResponseType>(
        "official event",
        upstreamUrl`/api/v1beta/official_events/${id}`,
        detailHeaders,
      ),
    ),
    fetchMap(ids.tonamelEventIds, (id) =>
      getOptional<TonamelEventGetByIdResponseType>(
        "tonamel event",
        upstreamUrl`/api/v1beta/tonamel_events/${id}`,
        detailHeaders,
      ),
    ),
    fetchMap(ids.unofficialEventIds, (id) =>
      getOptional<UnofficialEventGetByIdResponseType>(
        "unofficial event",
        upstreamUrl`/api/v1beta/unofficial_events/${id}`,
        detailHeaders,
      ),
    ),
    // 対戦の集計はまとめて1回。取れなければ記録ごとに取り直す(上流が古い場合)
    (async () => {
      const recordIds = page.records.map((record) => record.data.id);
      const batched = await fetchMatchSummaries(recordIds, detailHeaders);
      if (batched) return batched;

      return fetchMap(recordIds, async (id): Promise<MatchSummaryType | null> => {
        const list = await getOptional<MatchGetResponseType[]>(
          "matches",
          upstreamUrl`/api/v1beta/records/${id}/matches`,
          detailHeaders,
        );
        return Array.isArray(list) ? summarizeMatches(list) : null;
      });
    })(),
  ]);

  return {
    ...page,
    records: attachRecordCardDetails(page.records, {
      decks,
      officialEvents,
      tonamelEvents,
      unofficialEvents,
      matches,
    }),
  };
}

/*
 * 記録一覧(/records)の初期表示用。選択中タブの1ページ目を周辺情報ごと取る。
 * 取れなければ null にしてページは出す(クライアントが取り直す)。
 * 同じリクエスト内で同じ引数で二度呼ばれても1回で済ませる
 */
export const getRecordsInitialData = cache(
  async (userId: string, tab: RecordsTab): Promise<RecordGetResponseType | null> => {
    try {
      const page = await fetchRecordsPageWithDetails(userId, {
        eventType: recordsTabToEventType(tab),
        deckId: "",
        cursor: "",
      });
      return Array.isArray(page?.records) ? page : null;
    } catch (error) {
      console.error("failed to fetch records for the records page", error);
      return null;
    }
  },
);
