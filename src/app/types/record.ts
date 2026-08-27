import { TagType } from "@app/types/tag";

type Data = {
  id: string;
  created_at: Date;
  official_event_id: number;
  tonamel_event_id: string;
  friend_id: string;
  user_id: string;
  deck_id: string;
  deck_code_id: string;
  private_flg: boolean;
  ignore_stats_flg: boolean;
  regulation_id: number;
  tcg_meister_url: string;
  memo: string;
  // 自由形式イベント用。開催日(ISO文字列)と unofficial_events のID
  event_date: string;
  unofficial_event_id: string;
  // 付与されているタグ(付与順)。記録に付けたラベルで、大会順位のプリセット
  // (優勝・ベスト4 など)も同じ配列に入る。
  tags: TagType[];
};

export type RecordType = {
  cursor: string;
  data: Data;
};

export type RecordGetResponseType = {
  limit: number;
  offset: number;
  cursor: string;
  records: RecordType[];
};

export type RecordCreateRequestType = {
  official_event_id: number;
  tonamel_event_id: string;
  friend_id: string;
  deck_id: string;
  deck_code_id: string;
  private_flg: boolean;
  ignore_stats_flg: boolean;
  regulation_id: number;
  tcg_meister_url: string;
  memo: string;
  event_date: string;
  unofficial_event_id: string;
  // 付与するタグID(この配列の集合に置き換わる)。並びがそのまま表示順になる。
  tag_ids: string[];
};

export type RecordUpdateRequestType = {
  official_event_id: number;
  tonamel_event_id: string;
  friend_id: string;
  deck_id: string;
  deck_code_id: string;
  private_flg: boolean;
  ignore_stats_flg: boolean;
  regulation_id: number;
  tcg_meister_url: string;
  memo: string;
  event_date: string;
  unofficial_event_id: string;
  // 付与するタグID(この配列の集合に置き換わる)。並びがそのまま表示順になる。
  tag_ids: string[];
};

export type RecordGetByIdResponseType = Data;

export type RecordCreateResponseType = Data;

export type RecordUpdateResponseType = Data;
