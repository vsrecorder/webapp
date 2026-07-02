import { MatchPokemonSpriteType } from "@app/types/pokemon_sprite";

export type OpponentDeckUsageItemType = {
  deck_info: string;
  count: number;
  usage_rate: number;
  wins: number;
  losses: number;
  win_rate: number;
  pokemon_sprites: MatchPokemonSpriteType[];
};

export type OpponentDeckUsageStatType = {
  user_id: string;
  year_month: string;
  environment_id: string;
  season: string;
  regulation_id: string;
  deck_id?: string;
  total_matches: number;
  decks: OpponentDeckUsageItemType[];
};
