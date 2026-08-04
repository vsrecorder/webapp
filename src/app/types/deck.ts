import { DeckCodeType } from "@app/types/deck_code";
import { DeckPokemonSpriteType } from "@app/types/pokemon_sprite";

export type DeckData = {
  id: string;
  created_at: Date;
  archived_at: Date;
  // お気に入りに設定した日時。未設定のときはゼロ値(年が1)が返る。
  // 判定には isFavoritedDeck() を使う。
  favorited_at: Date;
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
  pokemon_sprites: DeckPokemonSpriteType[];
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

export type DeckFavoriteResponse = DeckData;

export type DeckUnfavoriteResponse = DeckData;

// お気に入りかどうか。APIは未設定時にゼロ値(0001-01-01)を返すため、
// archived_at と同じく「年が1でない」ことで判定する。
export function isFavoritedDeck(deck: { favorited_at?: Date } | null): boolean {
  if (!deck?.favorited_at) return false;

  return new Date(deck.favorited_at).getFullYear() !== 1;
}
