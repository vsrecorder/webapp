import { MatchPokemonSpriteType } from "@app/types/pokemon_sprite";

// 自分の対戦結果に付けた相手デッキの組み合わせ(表記 × スロット1/2のスプライト)1件。
// 上流(core-apiserver)の GET /api/v1beta/matches/opponent_decks が返す。項目名は対戦結果と揃えてある
export type OpponentDeckType = {
  opponents_deck_info: string;
  pokemon_sprites: MatchPokemonSpriteType[];
  // この組み合わせの対戦の数。多い順に並んでいる
  count: number;
  // この組み合わせと最後に対戦した記録の開催日(YYYY-MM-DD)
  last_event_date: string;
};

export type OpponentDecksGetResponseType = {
  data: OpponentDeckType[];
};

// 相手デッキの表記とスプライトの指定
export type OpponentDeckSpecType = {
  opponents_deck_info: string;
  pokemon_sprites: MatchPokemonSpriteType[];
};

// 一括置き換え。from と同じ組み合わせ(表記・1体目・2体目がすべて一致)の自分の対戦を to にする
export type OpponentDeckReplaceRequestType = {
  from: OpponentDeckSpecType;
  to: OpponentDeckSpecType;
};

export type OpponentDeckReplaceResponseType = {
  // 置き換えた対戦の数
  updated_count: number;
};
