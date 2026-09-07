import { DeckData } from "@app/types/deck";
import { MatchSummaryType } from "@app/types/match";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";
import { TagType } from "@app/types/tag";
import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";
import { UnofficialEventGetByIdResponseType } from "@app/types/unofficial_event";

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

// 記録カードに出す使用デッキの情報(名前とスプライトだけ)
export type RecordCardDeckType = Pick<DeckData, "id" | "name" | "pokemon_sprites">;

/*
 * 記録カードの描画に要る周辺情報。BFF(/api/records)とサーバ描画(records/page.tsx)が
 * 一覧の取得と同時にサーバ側でまとめて取り、各記録に付ける。
 *
 * 以前はカードごとにマウント時に3本(イベント・デッキ・対戦)取っていて、1ページ(10件)で
 * 30本、4タブぶんで120本の往復がブラウザから走っていた(本番ログでは記録一覧1回あたり
 * カード単位の呼び出しが13〜14本、BFF 経由の p50 は 200ms 超)。
 *
 * 項目が無い(undefined)のは「サーバで取れなかった」印で、カードが従来どおり自分で取る。
 * 記録にデッキやイベントが紐付いていない場合も無いままにする(カードも取らない)。
 */
export type RecordCardDetailsType = {
  deck?: RecordCardDeckType;
  official_event?: OfficialEventGetByIdResponseType;
  tonamel_event?: TonamelEventGetByIdResponseType;
  unofficial_event?: UnofficialEventGetByIdResponseType;
  matches?: MatchSummaryType;
};

export type RecordType = {
  cursor: string;
  data: Data;
  // BFF が付ける周辺情報。バックエンドの生の応答には無いので任意
  details?: RecordCardDetailsType;
};

export type RecordGetResponseType = {
  limit: number;
  offset: number;
  cursor: string;
  records: RecordType[];
  // BFF(/api/records)が付ける。1件多く取って決めた「次のページがあるか」。
  // バックエンドの生の応答には無いので任意
  has_next?: boolean;
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
