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
};

export type DeckCodeCreateRequestType = {
  deck_id: string;
  code: string;
  private_code_flg: boolean;
  memo: string;
  tag_ids: string[];
};

export type DeckCodeCreateResponseType = DeckCodeType;

export type DeckCodeUpdateRequestType = {
  private_code_flg: boolean;
  memo: string;
  tag_ids: string[];
};

export type DeckCodeUpdateResponseType = DeckCodeType;
