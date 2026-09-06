import { DeckGetResponseType, DeckType } from "@app/types/deck";

/*
 * デッキ一覧のページング補助。
 *
 * バックエンドの一覧 API は「次のページがあるか」を返さない。以前はクライアントが
 * 1ページ目の後に2ページ目を先読みして判定していたが、その往復が終わるまで骨格が
 * 消えず、初回表示が1往復ぶん遅れていた。BFF(/api/decks)とサーバ描画(decks/page.tsx)で
 * 1件多く(limit+1)取り、はみ出した1件の有無で次ページの有無を決めれば、往復を増やさずに判定できる。
 */

// 1ページに出す件数
export const DECK_PAGE_LIMIT = 10;

export type PeekedPage<T> = {
  // 画面に出すぶん(limit 件まで)
  items: T[];
  // limit を超える件があったか(＝次のページがある)
  hasNext: boolean;
  // はみ出した先頭の1件。次ページの先頭が取得済み(お気に入りの繰り上げで重複する)かの
  // 判定に使う。無ければ undefined
  peek: T | undefined;
};

// limit+1 件で取得した結果を「表示ぶん」と「次ページの有無」に分ける
export function splitPeekedPage<T>(fetched: T[], limit: number): PeekedPage<T> {
  const items = fetched.slice(0, limit);
  const peek = fetched.length > limit ? fetched[limit] : undefined;

  return { items, hasNext: peek !== undefined, peek };
}

// 上流から limit+1 件で取った応答を、クライアントへ返す形(limit 件 + has_next + next_first_id)に整える。
// 想定外の形(decks が配列でない)はそのまま返し、クライアント側の検査(取得失敗扱い)に任せる
export function toDeckPage(
  fetched: DeckGetResponseType,
  limit: number = DECK_PAGE_LIMIT,
): DeckGetResponseType {
  if (!Array.isArray(fetched?.decks)) return fetched;

  const page = splitPeekedPage(fetched.decks, limit);

  return {
    ...fetched,
    limit,
    decks: page.items,
    has_next: page.hasNext,
    next_first_id: page.peek?.data.id,
  };
}

export type DeckPageStep = {
  // このページで新たに増えるデッキ(取得済みのものは除く)
  appended: DeckType[];
  // 次の取得に使うカーソル。進められないときは今のカーソルのまま
  nextCursor: string;
  // 続きのページがあるか
  hasNext: boolean;
  // 次ページの先頭が取得済みのデッキか(お気に入りの繰り上げで重複している)。
  // このとき次ページは丸ごと取得済みの可能性があり、続きに未取得があるかは読まないと分からない
  peekLoaded: boolean;
};

/*
 * 1ページ取った結果から、一覧に足すデッキと次の取得の進め方を決める。
 *
 * - 失敗後の再読み込みやお気に入りの繰り上げで同じデッキが再び返ることがあるため、
 *   取得済み(loadedDeckIds)のデッキは足さない
 * - 続きの有無は has_next(BFF が付ける)で決める。無い応答ならカーソルが進むかで決め、
 *   次の取得が0件ならそこで止まる
 * - カーソルが進まないとき(サーバが同じページを返し続ける等)は続きなしとして打ち切る
 *
 * loadedDeckIds は変更しない(足すデッキの登録は呼び出し側が行う)。
 */
export function stepDeckPage(
  page: DeckGetResponseType,
  loadedDeckIds: ReadonlySet<string>,
  cursor: string,
): DeckPageStep {
  const appended = page.decks.filter((d) => !loadedDeckIds.has(d.data.id));
  const last = page.decks[page.decks.length - 1];
  const lastCursor = last?.cursor || "";
  const advanced = lastCursor !== "" && lastCursor !== cursor;
  const hasNext = advanced && (page.has_next ?? true);
  const peekLoaded = page.next_first_id !== undefined && loadedDeckIds.has(page.next_first_id);

  return { appended, nextCursor: advanced ? lastCursor : cursor, hasNext, peekLoaded };
}
