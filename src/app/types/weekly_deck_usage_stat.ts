import { MatchPokemonSpriteType } from "@app/types/pokemon_sprite";

// プラットフォーム全体の週次デッキ使用率における単一のデッキ変種（正規化済みスプライト指紋）
export type WeeklyDeckUsageItemType = {
  fingerprint: string;
  label: string;
  primary_sprite_id: string;
  count: number;
  usage_rate: number;
  wins: number;
  losses: number;
  win_rate: number;
  pokemon_sprites: MatchPokemonSpriteType[];
};

export type WeeklyDeckUsageStatType = {
  week: string;
  week_start: string;
  week_end: string;
  total_votes: number;
  contributor_count: number;
  decks: WeeklyDeckUsageItemType[];
};
