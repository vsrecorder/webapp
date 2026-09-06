import { DeckCodeType } from "@app/types/deck_code";
import { DeckUsageStatType } from "@app/types/deck_usage_stat";
import { KizunaType } from "@app/types/kizuna";
import { DeckPokemonSpriteType } from "@app/types/pokemon_sprite";
import { TagType } from "@app/types/tag";
import { isZeroDate } from "@app/utils/date";

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
  // 付与されたタグ。未設定のデッキでは空配列。
  tags: TagType[];
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
  // BFF(/api/decks)が付ける。1件多く取って決めた「次のページがあるか」と、
  // 次ページ先頭のデッキID(取得済みのお気に入りと重複していないかの判定に使う)。
  // バックエンドの生の応答には無いので任意
  has_next?: boolean;
  next_first_id?: string;
};

// デッキ一覧(/decks)の初期表示のためにサーバで取っておくデータ。
// 取れなかったものは null(クライアントが取り直す)
export type DecksInitialDataType = {
  // 利用中のデッキの1ページ目(BFF /api/decks と同じ形)
  decks: DeckGetResponseType | null;
  // 全デッキのきずなLv.
  kizuna: KizunaType | null;
  // 全期間の戦績
  usage: DeckUsageStatType | null;
};

export type DeckCreateRequestType = {
  name: string;
  private_flg: boolean;
  deck_code: string;
  private_deck_code_flg: boolean;
  pokemon_sprites: DeckPokemonSpriteType[];
  tag_ids: string[];
};

export type DeckUpdateRequestType = {
  name: string;
  private_flg: boolean;
  pokemon_sprites: DeckPokemonSpriteType[];
  tag_ids: string[];
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

  return !isZeroDate(deck.favorited_at);
}
