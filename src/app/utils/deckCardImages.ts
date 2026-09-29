import { DeckCardDetailType } from "@app/types/deckcard";

import { fetchDeckCardDetail } from "@app/utils/deckcard";

/*
 * デッキコードから「カード名 → カード画像 URL」の対応表を作る。
 *
 * カード名だけを持っている場所からカード画像を出すために使う(類似している入賞デッキの
 * シートの差分カードのタグ)。カード名で画像を引く口は無いので、そのカードが入っている
 * デッキの内訳(/api/deckcards/{code}/detail)を引き、名前で突き合わせる。
 * 差分カードはどちらかのデッキに必ず入っているので、
 *   入賞デッキにだけあるカード → その入賞デッキの内訳
 *   検索元のデッキにだけあるカード → 検索元のデッキの内訳
 * から引ける。
 *
 * 取得はタップされてから。シートを開いた時点で 12 件ぶんの内訳を取ると、いちばん見たい
 * デッキ画像の取得と競合する。一度引いたデッキはデッキコードごとに覚えておき、
 * 同じデッキの別のカードを続けて見るときは取り直さない。
 */

// 同時に覚えておくデッキの数。シート 1 枚が最大 13 デッキ(入賞 12 件＋検索元)なので、
// 開き直しをまたいで効く程度の余裕を持たせる
const MAX_CACHED_DECKS = 32;

/*
 * 名前の突き合わせ用にそろえた形。
 *
 * 突き合わせる 2 つの名前は出どころが違う(差分カードはバトラボのカードマスタ、
 * 内訳は deckcard-api)。空白の入れ方や英字の大小だけで外さないよう、空白を取り除き
 * 小文字にしてから比べる。カード名は空白を取っても別のカードと衝突しない
 * (「ネストボール」「ボスの指令」のように区切りとしての空白しか入らない)。
 */
export function normalizeCardName(name: string): string {
  return name.replace(/\s+/g, "").toLowerCase();
}

// 内訳(印刷違いも別カード)から対応表を作る。同じ名前の絵柄違いは最初の 1 枚を代表にする
export function deckCardImageMap(detail: DeckCardDetailType): Map<string, string> {
  const map = new Map<string, string>();

  const groups = [
    detail.card_pke,
    detail.card_gds,
    detail.card_tool,
    detail.card_tech,
    detail.card_sup,
    detail.card_sta,
    detail.card_ene,
  ];

  for (const cards of groups) {
    for (const card of cards ?? []) {
      if (!card?.card_name || !card.image_url) continue;

      const key = normalizeCardName(card.card_name);
      if (!map.has(key)) map.set(key, card.image_url);
    }
  }

  return map;
}

// 対応表からカード名で画像 URL を引く。見つからなければ null(呼び出し側が文言を出す)
export function findCardImageUrl(
  map: Map<string, string>,
  cardName: string,
): string | null {
  return map.get(normalizeCardName(cardName)) ?? null;
}

// デッキコードごとの対応表。取得中の約束(Promise)を入れておき、同じデッキを二重に取らない
const imageMapCache = new Map<string, Promise<Map<string, string>>>();

export function fetchDeckCardImageMap(code: string): Promise<Map<string, string>> {
  const cached = imageMapCache.get(code);
  if (cached) return cached;

  // 失敗は覚えない(再試行で取り直せるように)
  const pending = fetchDeckCardDetail(code)
    .then(deckCardImageMap)
    .catch((error: unknown) => {
      imageMapCache.delete(code);
      throw error;
    });

  imageMapCache.set(code, pending);

  // 入れた順に古いものから捨てる(Map は挿入順を保つ)
  if (imageMapCache.size > MAX_CACHED_DECKS) {
    const oldest = imageMapCache.keys().next().value;
    if (oldest !== undefined) imageMapCache.delete(oldest);
  }

  return pending;
}

// テスト用。覚えている対応表を捨てる
export function clearDeckCardImageMapCache(): void {
  imageMapCache.clear();
}
