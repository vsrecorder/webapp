import { MatchPokemonSpriteType } from "@app/types/pokemon_sprite";

// プラットフォーム全体の週次デッキ使用率における単一のデッキ変種
// （スプライトの集合のみで正規化した指紋。デッキ名等のテキストは使わず、並び順も無視する）
export type WeeklyDeckUsageItemType = {
  fingerprint: string;
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
