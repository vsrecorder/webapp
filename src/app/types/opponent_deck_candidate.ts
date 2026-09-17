import { MatchPokemonSpriteType } from "@app/types/pokemon_sprite";

// 相手デッキの入力候補1件。項目名は対戦結果(MatchType)と揃えてあり、
// 候補の組み立て方(相手デッキの表記 × スロット1/2のスプライト)も同じ。
export type OpponentDeckCandidateType = {
  opponents_deck_info: string;
  pokemon_sprites: MatchPokemonSpriteType[];
  // この組み合わせが対戦結果に現れた回数。多い順に並んでいる
  count: number;
};

export type OpponentDeckCandidatesGetResponseType = {
  limit: number;
  data: OpponentDeckCandidateType[];
};
