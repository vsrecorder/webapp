"use client";

import { SeededResource, useSeededResource } from "@app/hooks/useSeededResource";

import { fetchDeckCardImageMap, findCardImageUrl } from "@app/utils/deckCardImages";

/*
 * カード名から、そのカードの画像 URL を引く。
 *
 * カード名で画像を引ける口は無いので、そのカードが入っているデッキ(deckCode)の内訳を
 * 引いて名前で突き合わせる(deckCardImages を参照)。内訳はデッキコードごとに覚えてあるので、
 * 同じデッキの別のカードを続けて開いても取り直しにはならない。
 *
 * card が null のあいだは取りにいかない(タップされたときだけ渡す)。
 * 内訳に見当たらなかったときは url が null になる(取得の失敗とは分ける)。
 */

export type DeckCardImageTarget = {
  // カードが入っているデッキのコード
  deckCode: string;
  cardName: string;
};

export type DeckCardImageView = { url: string | null };

// useSeededResource の鍵は 1 つの文字列なので、デッキコードとカード名を区切って持つ。
// デッキコードに | は出てこないので、最初の区切りで戻せる(カード名に含まれても崩れない)
const KEY_SEPARATOR = "|";

async function fetchCardImage(key: string): Promise<DeckCardImageView> {
  const separator = key.indexOf(KEY_SEPARATOR);
  const deckCode = key.slice(0, separator);
  const cardName = key.slice(separator + 1);

  const imageMap = await fetchDeckCardImageMap(deckCode);

  return { url: findCardImageUrl(imageMap, cardName) };
}

export function useDeckCardImage(
  card: DeckCardImageTarget | null,
): SeededResource<DeckCardImageView> {
  return useSeededResource(
    card ? `${card.deckCode}${KEY_SEPARATOR}${card.cardName}` : null,
    fetchCardImage,
  );
}
