import { mutate } from "swr";

import { DeckCodeType } from "@app/types/deck_code";
import { RecordCardDeckCodeType } from "@app/types/record";
import { refreshRecordingNow } from "@app/utils/recordingNowClient";

/*
 * バージョン(デッキコード)のスプライトを、ブラウザ側で取る・変更を行き渡らせるための部品。
 *
 * バージョンのスプライトは、バージョン履歴・記録詳細・記録一覧のカード・カレンダー・
 * 「記録中」のバーに出る。このうちバージョン履歴と記録詳細は SWR のバージョン一覧
 * (useDeckCodes)から引くので、保存した側が取り直させれば追随する。残りは持ち方が違う:
 *   - 記録一覧のカード: 一覧 API が付けた値を state に持つ(useSeededResource)
 *   - カレンダー・「記録中」のバー: それぞれ別の SWR キー
 * これらは保存した側から知らせないと、再読み込みするまで前のスプライトのままになる。
 */

type Listener = (deckCode: RecordCardDeckCodeType) => void;

const listeners = new Set<Listener>();

// バージョンのスプライトが変わったことを受け取る(記録一覧のカードが使う)。戻り値で解除する
export function subscribeDeckCodeSprites(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

const CALENDAR_KEY_PATTERN = /^\/api\/users\/[^/]+\/calendar$/;

/*
 * バージョンのスプライトを保存したあとに呼ぶ。
 *
 * 記録一覧のカードへは保存した値をそのまま配る(取り直さない)。同じバージョンの記録が
 * 並ぶと、取り直しではカードの枚数ぶん往復が走るため。カードは次に一覧を取り直した時点で
 * サーバの値に置き換わるので、ここで配った値が居座ることはない。
 *
 * カレンダーと「記録中」のバーは、手元にキャッシュがあれば取り直させる
 * (表示していなければ次に開いたときの取得で追いつくので、待たずに投げっぱなしにする)。
 */
export function notifyDeckCodeSpritesChanged(deckCode: RecordCardDeckCodeType): void {
  // 保存より前に始めた取得が残っていると、あとから来たカードが保存前の値を掴むので外す
  inflight.delete(deckCode.id);

  for (const listener of [...listeners]) {
    try {
      listener(deckCode);
    } catch (error) {
      // 1枚のカードの失敗で、残りのカードへの通知を止めない
      console.error(error);
    }
  }

  void mutate((key) => typeof key === "string" && CALENDAR_KEY_PATTERN.test(key));
  refreshRecordingNow();
}

// 取得中のバージョン(id → 取得の Promise)
const inflight = new Map<string, Promise<RecordCardDeckCodeType>>();

/*
 * 記録カードが使用バージョンを自分で取るときの取得(一覧 API が付けられなかったときだけ使う)。
 *
 * 同じバージョンを使う記録は並ぶことが多い(同じデッキで続けて出た大会など)。カードごとに
 * 取ると枚数ぶん往復するので、取得中の同じバージョンは1本を分け合う。
 * 終わったら(成功・失敗とも)手放すので、あとからの取り直しは新しく取りに行く。
 */
export function fetchDeckCodeForCard(id: string): Promise<RecordCardDeckCodeType> {
  const running = inflight.get(id);
  if (running) return running;

  const request = (async (): Promise<RecordCardDeckCodeType> => {
    const res = await fetch(`/api/deckcodes/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const deckCode: DeckCodeType = await res.json();

    // カードに要る項目だけにする(一覧 API が付ける形と揃える)
    return { id: deckCode.id, pokemon_sprites: deckCode.pokemon_sprites ?? [] };
  })();

  inflight.set(id, request);

  const release = () => {
    // 通知で外されたあとに別の取得が入っていたら、そちらは消さない
    if (inflight.get(id) === request) inflight.delete(id);
  };
  request.then(release, release);

  return request;
}
