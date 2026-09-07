import { CDN_ORIGIN } from "@app/utils/cdn";

const DECK_IMAGE_BASE = `${CDN_ORIGIN}/images/decks`;

// デッキ画像(2:1の横長)のURLを返す。デッキコードごとに1枚が CDN に置いてある。
// CDN に無いコード(生成前・削除済みなど)では 404 が返るため、表示側は失敗も扱うこと
// (ZoomableDeckImage / DeckCard のギャラリー表示が参考になる)。
export function deckImageUrl(code: string): string {
  return `${DECK_IMAGE_BASE}/${code}.jpg`;
}
