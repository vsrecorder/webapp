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

// 記録のイベントの種類。どれでもない記録(古いデータなど)は空文字
export type OpponentDeckMatchEventType = "official" | "tonamel" | "unofficial" | "";

// 対局 1 本の先攻・後攻と勝敗。勝敗の項目名は対局(GameType)と揃えてある
export type OpponentDeckMatchGameType = {
  go_first: boolean;
  winnging_flg: boolean;
};

// 相手デッキの組み合わせに当てはまる対戦 1 件と、その対戦を付けた記録の見出し。
// 上流の GET /api/v1beta/matches/opponent_decks/matches が返す(開催日の新しい順・最大 100 件)
export type OpponentDeckMatchType = {
  id: string;
  record_id: string;
  // 記録の開催日(YYYY-MM-DD)。未設定の記録は空文字
  event_date: string;
  event_type: OpponentDeckMatchEventType;
  // イベント名。BFF で公式イベントの冗長な部分を除き、取得できなければ「(タイトル不明)」にしてある
  event_title: string;
  // 記録に登録した自分のデッキの名前。未登録なら空文字
  deck_name: string;
  bo3_flg: boolean;
  group_match_flg: boolean;
  group_match_victory_flg: boolean;
  default_victory_flg: boolean;
  default_defeat_flg: boolean;
  victory_flg: boolean;
  draw_flg: boolean;
  games: OpponentDeckMatchGameType[];
};

export type OpponentDeckMatchesGetResponseType = {
  data: OpponentDeckMatchType[];
};
