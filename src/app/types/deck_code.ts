import { DeckPokemonSpriteType } from "@app/types/pokemon_sprite";
import { TagType } from "@app/types/tag";

export type DeckCodeType = {
  id: string;
  created_at: Date;
  user_id: string;
  deck_id: string;
  code: string;
  private_code_flg: boolean;
  memo: string;
  // 付与されたタグ。未設定のデッキコードでは空配列。
  tags: TagType[];
  // このバージョンに設定したスプライト。未設定なら空配列で、表示はデッキのスプライトへ
  // フォールバックする(resolveVersionSprites)。この項目を返さない古いバックエンドの応答や、
  // 別経路で組み立てた値では undefined になりうるので任意にしている。
  pokemon_sprites?: DeckPokemonSpriteType[];
};

export type DeckCodeCreateRequestType = {
  deck_id: string;
  code: string;
  private_code_flg: boolean;
  memo: string;
  tag_ids: string[];
  // 省略・空配列は未設定(デッキのスプライトを表示する)
  pokemon_sprites?: DeckPokemonSpriteType[];
};

export type DeckCodeCreateResponseType = DeckCodeType;

export type DeckCodeUpdateRequestType = {
  private_code_flg: boolean;
  memo: string;
  tag_ids: string[];
  // 省略するとスプライトには触れない(現在の設定を保つ)。空配列を送ると未設定に戻す。
  // メモやタグだけを更新する経路では省略すること
  pokemon_sprites?: DeckPokemonSpriteType[];
};

export type DeckCodeUpdateResponseType = DeckCodeType;
