export type RecordCreateRequestType = {
  official_event_id: number;
  tonamel_event_id: string;
  friend_id: string;
  deck_id: string;
  deck_code_id: string;
  private_flg: boolean;
  tcg_meister_url: string;
  memo: string;
};

export type RecordCreateResponseType = {
  id: string;
  created_at: Date;
  official_event_id: number;
  tonamel_event_id: string;
  friend_id: string;
  deck_id: string;
  deck_code_id: string;
  private_flg: boolean;
  tcg_meister_url: string;
  memo: string;
};
