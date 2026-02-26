import { DeckCodeType } from "@app/types/deck_code";
import { DeckPokemonSpriteType } from "@app/types/pokemon_sprite";

export type DeckData = {
  id: string;
  created_at: Date;
  archived_at: Date;
  user_id: string;
  name: string;
  private_flg: boolean;
  latest_deck_code: DeckCodeType;
  pokemon_sprites: DeckPokemonSpriteType[];
};

export type DeckType = {
  cursor: string;
  data: DeckData;
};

export type DeckGetResponseType = {
  limit: number;
  offset: number;
  cursor: string;
  decks: DeckType[];
};

export type DeckCreateRequestType = {
  name: string;
  private_flg: boolean;
  deck_code: string;
  private_deck_code_flg: boolean;
};

export type DeckUpdateRequestType = {
  name: string;
  private_flg: boolean;
  pokemon_sprites: DeckPokemonSpriteType[];
};

export type DeckGetAllType = DeckData[];

export type DeckGetByIdResponseType = DeckData;

export type DeckCreateResponseType = DeckData;

export type DeckUpdateResponseType = DeckData;

export type DeckArchiveResponse = DeckData;

export type DeckUnarchiveResponse = DeckData;
