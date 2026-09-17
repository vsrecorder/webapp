// 相手デッキの入力候補。上流(core-apiserver)の
// GET /api/v1beta/matches/opponent_deck_candidates が返す集計結果を、画面が使う形へ直す。
//
// 候補の中身(自身の履歴を先頭に、不足分を他ユーザの候補で埋める / 期間の絞り込み /
// 集計対象外の記録の除外 / 重複排除 / 出現回数順の並び)はすべて上流で済んでいる。
// ここでは表示に要る項目へ詰め替えるだけで、絞り込みや並び替えを足さないこと
// (画面ごとに候補が食い違う原因になる)。

import {
  OpponentDeckCandidateType,
  OpponentDeckCandidatesGetResponseType,
} from "@app/types/opponent_deck_candidate";
import { PokemonSpriteType } from "@app/types/pokemon_sprite";
import { CDN_ORIGIN } from "@app/utils/cdn";
import { getSpriteBySlot } from "@app/utils/spriteSlot";

const SPRITE_BASE_URL = `${CDN_ORIGIN}/images/pokemon-sprites`;

// 相手デッキ候補として画面へ出す件数。上流へ渡す limit でもある
// (上流の limit は「候補の数」なので、この件数までは候補が埋まる)
export const MAX_OPPONENT_DECK_CANDIDATES = 50;

// 画面が扱う候補。相手デッキの表記と、表示枠1/2のスプライト。
export type DeckHistory = {
  deckInfo: string;
  sprite1: PokemonSpriteType | null;
  sprite2: PokemonSpriteType | null;
};

// スプライトIDから画像URLを組み立てる。IDは4桁ゼロ埋めだが、画像のファイル名はゼロ埋めなし。
function toSprite(id: string | undefined): PokemonSpriteType | null {
  if (!id) return null;

  return {
    id,
    name: "",
    image_url: `${SPRITE_BASE_URL}/${id.replace(/^0+(?!$)/, "")}.png`,
  };
}

export async function fetchOpponentDeckCandidates(
  url: string,
): Promise<OpponentDeckCandidatesGetResponseType> {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

  return res.json();
}

// 上流の候補を、画面が扱う形へ詰め替える(順序はそのまま保つ)。
export function toDeckHistories(
  candidates: OpponentDeckCandidateType[] | undefined,
): DeckHistory[] {
  if (!candidates) return [];

  return candidates.map((candidate) => ({
    deckInfo: candidate.opponents_deck_info,
    sprite1: toSprite(getSpriteBySlot(candidate.pokemon_sprites, 1)?.id),
    sprite2: toSprite(getSpriteBySlot(candidate.pokemon_sprites, 2)?.id),
  }));
}
