import { MatchSummaryType } from "@app/types/match";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";
import {
  RecordCardDeckType,
  RecordCardDetailsType,
  RecordGetResponseType,
  RecordType,
} from "@app/types/record";
import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";
import { UnofficialEventGetByIdResponseType } from "@app/types/unofficial_event";
import { splitPeekedPage } from "@app/utils/deckListPage";

/*
 * 記録一覧のページング補助と、カードの周辺情報(デッキ・イベント・対戦の集計)を記録に付ける処理。
 *
 * デッキ一覧(deckListPage)と同じく、バックエンドの一覧 API は「次のページがあるか」を返さない。
 * 以前はクライアントが1ページ目の後に2ページ目を先読みして判定し、その往復ぶん初回表示が
 * 遅れていた。BFF(/api/records)とサーバ描画(records/page.tsx)で1件多く(limit+1)取り、
 * はみ出した1件の有無で決める。
 *
 * ここは純粋関数だけ(サーバ・クライアント両方から import する)。上流の呼び出しは
 * utils/recordListServer にある。
 */

// 1ページに出す件数(バックエンドの既定と同じ)
export const RECORD_PAGE_LIMIT = 10;

export type RecordEventType = "official" | "tonamel" | "unofficial";

// 記録の種別(公式 / Tonamel / 自由形式)。どのカード部品で描くか、どのイベント情報を取るかを決める
export function resolveRecordEventType(data: RecordType["data"]): RecordEventType | null {
  if (data.official_event_id && data.official_event_id !== 0) return "official";
  if (data.tonamel_event_id) return "tonamel";
  if (data.unofficial_event_id) return "unofficial";
  return null;
}

// 上流から limit+1 件で取った応答を、クライアントへ返す形(limit 件 + has_next)に整える。
// 想定外の形(records が配列でない)はそのまま返し、呼び出し側の検査に任せる
export function toRecordPage(
  fetched: RecordGetResponseType,
  limit: number = RECORD_PAGE_LIMIT,
): RecordGetResponseType {
  if (!Array.isArray(fetched?.records)) return fetched;

  const page = splitPeekedPage(fetched.records, limit);

  return { ...fetched, limit, records: page.items, has_next: page.hasNext };
}

export type RecordPageStep = {
  // このページで新たに増える記録(取得済みのものは除く)
  appended: RecordType[];
  // 次の取得に使うカーソル。進められないときは今のカーソルのまま
  nextCursor: string;
  // 続きのページがあるか
  hasNext: boolean;
};

/*
 * 1ページ取った結果から、一覧に足す記録と次の取得の進め方を決める。
 *
 * - 失敗後の再読み込みなどで同じ記録が再び返ることがあるため、取得済み(loadedIds)は足さない
 * - 続きの有無は has_next(BFF が付ける)で決める。無い応答(古い形)なら
 *   「1ページぶん埋まっていれば続きがある」とみなし、次の取得が0件ならそこで止まる
 * - カーソルが進まないとき(サーバが同じページを返し続ける等)は続きなしとして打ち切る
 */
export function stepRecordPage(
  page: RecordGetResponseType,
  loadedIds: ReadonlySet<string>,
  cursor: string,
): RecordPageStep {
  const appended = page.records.filter((r) => !loadedIds.has(r.data.id));
  const last = page.records[page.records.length - 1];
  const lastCursor = last?.cursor || "";
  const advanced = lastCursor !== "" && lastCursor !== cursor;
  const full = page.records.length >= (page.limit || RECORD_PAGE_LIMIT);
  const hasNext = advanced && (page.has_next ?? full);

  return { appended, nextCursor: advanced ? lastCursor : cursor, hasNext };
}

export type RecordCardIds = {
  deckIds: string[];
  officialEventIds: number[];
  tonamelEventIds: string[];
  unofficialEventIds: string[];
};

// 1ページの記録から、カードの描画に要るデッキ・イベントの ID を重複なく集める
// (同じデッキ・同じイベントの記録が並ぶことが多いので、取得はまとめて1回にする)
export function collectRecordCardIds(records: RecordType[]): RecordCardIds {
  const deckIds = new Set<string>();
  const officialEventIds = new Set<number>();
  const tonamelEventIds = new Set<string>();
  const unofficialEventIds = new Set<string>();

  for (const { data } of records) {
    if (data.deck_id) deckIds.add(data.deck_id);

    switch (resolveRecordEventType(data)) {
      case "official":
        officialEventIds.add(data.official_event_id);
        break;
      case "tonamel":
        tonamelEventIds.add(data.tonamel_event_id);
        break;
      case "unofficial":
        unofficialEventIds.add(data.unofficial_event_id);
        break;
    }
  }

  return {
    deckIds: [...deckIds],
    officialEventIds: [...officialEventIds],
    tonamelEventIds: [...tonamelEventIds],
    unofficialEventIds: [...unofficialEventIds],
  };
}

export type RecordCardLookups = {
  decks: ReadonlyMap<string, RecordCardDeckType>;
  officialEvents: ReadonlyMap<number, OfficialEventGetByIdResponseType>;
  tonamelEvents: ReadonlyMap<string, TonamelEventGetByIdResponseType>;
  unofficialEvents: ReadonlyMap<string, UnofficialEventGetByIdResponseType>;
  // 記録 id → 対戦の集計
  matches: ReadonlyMap<string, MatchSummaryType>;
};

// 取れた周辺情報を各記録に付ける。取れなかった項目は付けない(カードが自分で取る)
export function attachRecordCardDetails(
  records: RecordType[],
  lookups: RecordCardLookups,
): RecordType[] {
  return records.map((record) => {
    const { data } = record;
    const details: RecordCardDetailsType = {};

    const deck = data.deck_id ? lookups.decks.get(data.deck_id) : undefined;
    if (deck) details.deck = deck;

    switch (resolveRecordEventType(data)) {
      case "official": {
        const event = lookups.officialEvents.get(data.official_event_id);
        if (event) details.official_event = event;
        break;
      }
      case "tonamel": {
        const event = lookups.tonamelEvents.get(data.tonamel_event_id);
        if (event) details.tonamel_event = event;
        break;
      }
      case "unofficial": {
        const event = lookups.unofficialEvents.get(data.unofficial_event_id);
        if (event) details.unofficial_event = event;
        break;
      }
    }

    const matches = lookups.matches.get(data.id);
    if (matches) details.matches = matches;

    return { ...record, details };
  });
}
