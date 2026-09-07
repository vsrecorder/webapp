import { GameType, GameRequestType } from "@app/types/game";
import { MatchPokemonSpriteType } from "@app/types/pokemon_sprite";
import { TagType } from "@app/types/tag";

export type MatchType = {
  id: string;
  created_at: Date;
  record_id: string;
  deck_id: string;
  deck_code_id: string;
  user_id: string;
  opponents_user_id: string;
  bo3_flg: boolean;
  group_match_flg: boolean;
  qualifying_round_flg: boolean;
  final_tournament_flg: boolean;
  default_victory_flg: boolean;
  default_defeat_flg: boolean;
  victory_flg: boolean;
  draw_flg: boolean;
  group_match_victory_flg: boolean;
  opponents_deck_info: string;
  memo: string;
  games: GameType[];
  pokemon_sprites: MatchPokemonSpriteType[];
  // 付与されたタグ。未設定の対戦結果では空配列。
  tags: TagType[];
};

export type MatchCreateRequestType = {
  record_id: string;
  deck_id: string;
  deck_code_id: string;
  opponents_user_id: string;
  bo3_flg: boolean;
  group_match_flg: boolean;
  qualifying_round_flg: boolean;
  final_tournament_flg: boolean;
  default_victory_flg: boolean;
  default_defeat_flg: boolean;
  victory_flg: boolean;
  draw_flg: boolean;
  group_match_victory_flg: boolean;
  opponents_deck_info: string;
  memo: string;
  games: GameRequestType[];
  pokemon_sprites: MatchPokemonSpriteType[];
  tag_ids: string[];
};

export type MatchUpdateRequestType = {
  record_id: string;
  deck_id: string;
  deck_code_id: string;
  opponents_user_id: string;
  bo3_flg: boolean;
  group_match_flg: boolean;
  qualifying_round_flg: boolean;
  final_tournament_flg: boolean;
  default_victory_flg: boolean;
  default_defeat_flg: boolean;
  victory_flg: boolean;
  draw_flg: boolean;
  group_match_victory_flg: boolean;
  opponents_deck_info: string;
  memo: string;
  games: GameRequestType[];
  pokemon_sprites: MatchPokemonSpriteType[];
  tag_ids: string[];
};

export type MatchCreateResponseType = MatchType;

export type MatchUpdateResponseType = MatchType;

export type MatchGetResponseType = MatchType;

export type MatchOrderItemType = {
  id: string;
  qualifying_round_flg: boolean;
  final_tournament_flg: boolean;
};

export type MatchReorderRequestType = {
  matches: MatchOrderItemType[];
};

// 上流(GET /api/v1beta/matches/summary)がまとめて返す、記録ごとの対戦集計。
// record_id 付きで、記録一覧の1ページぶんを1回の呼び出しで取れる
export type MatchSummaryByRecordType = MatchSummaryType & {
  record_id: string;
};

export type MatchSummariesGetResponseType = {
  summaries: MatchSummaryByRecordType[];
};

// 記録カードに出す対戦の集計。対戦一覧そのもの(games やスプライトを含み大きい)ではなく、
// カードの描画に要る数だけを持つ。BFF(/api/records)がサーバ側で集計して記録に付ける
export type MatchSummaryType = {
  total: number;
  wins: number;
  losses: number;
  // 両者引き分け(BO3のみ)
  draws: number;
  // チーム戦 / BO3 が1つでも含まれるか(カード右上のバッジ)
  has_group_match: boolean;
  has_bo3: boolean;
};
