export type PokemonSpriteType = {
  id: string;
  name: string;
  image_url: string;
};

export type MatchPokemonSpriteType = {
  id: string;
  // 表示枠の位置(1 or 2)。deck と同様、この値でスロットを固定して往復させる。
  // position を持たない旧データも存在するため任意項目とし、その場合は配列
  // インデックスでスロットを解決する(spriteSlot ユーティリティ参照)。
  position?: number;
};

export type MatchPokemonSpriteCreateRequestType = MatchPokemonSpriteType;
export type MatchPokemonSpriteUpdateRequestType = MatchPokemonSpriteType;

export type MatchPokemonSpriteCreateResponseType = MatchPokemonSpriteType;
export type MatchPokemonSpriteUpdateResponseType = MatchPokemonSpriteType;

export type DeckPokemonSpriteType = {
  id: string;
  // 表示枠の位置(1 or 2)。この値でスロットを固定して往復させる。
  // position を持たない旧データも存在するため任意項目とし、その場合は配列
  // インデックスでスロットを解決する(deckSprite ユーティリティ参照)。
  position?: number;
};

export type DeckPokemonSpriteCreateRequestType = DeckPokemonSpriteType;
export type DeckPokemonSpriteUpdateRequestType = DeckPokemonSpriteType;

export type DeckPokemonSpriteCreateResponseType = DeckPokemonSpriteType;
export type DeckPokemonSpriteUpdateResponseType = DeckPokemonSpriteType;
