import { MatchPokemonSpriteType } from "@app/types/pokemon_sprite";

export type RecentMatchItemType = {
  sequence: number;
  event_date: string;
  deck_id: string;
  opponents_deck_info: string;
  victory: boolean;
  rolling_win_rate: number;
  environment_id?: string;
  environment_title?: string;
  pokemon_sprites: MatchPokemonSpriteType[];
};

export type RecentMatchStatType = {
  user_id: string;
  count: number;
  deck_id?: string;
  total_matches: number;
  wins: number;
  win_rate: number;
  matches: RecentMatchItemType[];
};
