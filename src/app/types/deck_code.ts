export type DeckCodeType = {
  id: string;
  created_at: Date;
  user_id: string;
  deck_id: string;
  code: string;
  private_code_flg: boolean;
  memo: string;
};

export type DeckCodeCreateRequestType = {
  deck_id: string;
  code: string;
  private_code_flg: boolean;
  memo: string;
};

export type DeckCodeCreateResponseType = DeckCodeType;
