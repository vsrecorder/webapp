import { DeckPokemonSpriteType } from "@app/types/pokemon_sprite";

export type DeckUsageItemType = {
  deck_id: string;
  name: string;
  count: number;
  usage_rate: number;
  pokemon_sprites: DeckPokemonSpriteType[];
};

export type DeckUsageStatType = {
  user_id: string;
  year_month: string;
  environment_id: string;
  season: string;
  total_records: number;
  decks: DeckUsageItemType[];
};
