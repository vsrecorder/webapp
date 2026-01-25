import { GameType } from "@app/types/game";

export type MatchType = {
  id: string;
  created_at: Date;
  record_id: string;
  deck_id: string;
  deck_code_id: string;
  user_id: string;
  opponents_user_id: string;
  bo3_flg: boolean;
  qualifying_round_flg: boolean;
  final_tournament_flg: boolean;
  default_victory_flg: boolean;
  default_defeat_flg: boolean;
  victory_flg: boolean;
  opponents_deck_info: string;
  memo: string;
  games: GameType;
};

export type MatchGetResponseType = MatchType;
