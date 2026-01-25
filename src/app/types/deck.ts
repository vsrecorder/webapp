type DeckCode = {
  id: string;
  created_at: Date;
  user_id: string;
  deck_id: string;
  code: string;
  private_code_flg: boolean;
};

type Data = {
  id: string;
  created_at: Date;
  archived_at: Date;
  user_id: string;
  name: string;
  code: string;
  private_code_flg: boolean;
  private_flg: boolean;
  latest_deck_code: DeckCode;
};

export type DeckType = {
  cursor: string;
  data: Data;
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

export type DeckGetByIdResponseType = Data;

export type DeckCreateResponseType = Data;
