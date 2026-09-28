import { createHash } from "node:crypto";

import { DeckArchetypeType } from "@app/types/deck_archetype";

// シティリーグの大会個別ページ(/cityleague_results/[id])の OGP 画像に載せる優勝デッキ。

export type EventOgWinner = {
  // 主デッキ名(例「ドラパルトex」)
  name: string;
  // 型の名前(例「バシャーモ型」)。無ければ null
  variant: string | null;
  // 分類のスプライト(図鑑 ID)。デッキのアイコンと同じく先頭 2 体まで。
  // 型があれば vslab がその型の組み合わせ(例 バシャーモ型 → ドラパルト＋バシャーモ)を返すので、
  // そのまま使えば型ごとの 2 体になる(型にスプライトの定義が無ければ主デッキのもの)
  spriteIds: string[];
};

// 優勝デッキ入りの画像のレイアウトの版(1: デッキ名の下に小さなスプライト、2: 右に大きなスプライト)
const EVENT_WINNER_OG_LAYOUT = 2;

const tidy = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

/*
 * 優勝デッキの分類(バトラボ)から、OGP 画像に載せる名前とスプライトを取り出す。
 *
 * 分類が無い(2027 シーズンより前・vslab の索引にまだ無い)か未分類なら null を返し、
 * 画像は従来の店舗名と日付だけのものになる。名前の空白は 1 つに詰める(定義側で 2 つ続くものがある)。
 */
export function eventOgWinner(archetype: DeckArchetypeType | undefined): EventOgWinner | null {
  const name = archetype?.label ? tidy(archetype.archetypeName) : "";
  if (!name) return null;

  return {
    name,
    variant: tidy(archetype?.variantName) || null,
    spriteIds: (archetype?.sprites ?? []).slice(0, 2),
  };
}

/*
 * 個別ページの OGP 画像のキー(ogImageUrlFor に渡す名前)。
 *
 * 画像は一度置いたら作り直さない(ogStorage)。結果は開催日のあとに登録され、分類(vslab の索引)は
 * さらに数分遅れるので、優勝デッキが分かる前に描いた画像が残り続けないよう、載せる中身をキーに含める。
 * 分類の名前やスプライトが後から直った場合も別の画像になる。
 *
 * 優勝デッキが無いときは従来のキーのまま(既に置いてある画像をそのまま使い、作り直させない)。
 *
 * 優勝デッキ入りの画像のデザインを変えたら EVENT_WINNER_OG_LAYOUT を上げる(OG_IMAGE_VERSION を
 * 上げると全ページの画像が作り直しになるため、この画像だけの版を持つ)。
 */
export function cityleagueEventOgName(eventId: number, winner: EventOgWinner | null): string {
  const base = `cityleague_results/${eventId}`;
  if (!winner) return base;

  const digest = createHash("sha256")
    .update(JSON.stringify([winner.name, winner.variant, winner.spriteIds]))
    .digest("hex")
    .slice(0, 12);

  return `${base}-w${EVENT_WINNER_OG_LAYOUT}-${digest}`;
}
