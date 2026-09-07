type OfficialEventListResponseBase = {
  type_id: number;
  league_type: number;
  start_date: Date;
  end_date: Date;
  count: number;
};

/*
 * 上流(core-apiserver)の一覧応答。1件あたり全フィールドを持つ。
 * BFF(api/official_events/route.ts)と、上流を直接叩くサーバ側の処理
 * (utils/cityleague.ts)がこちらを使う。
 */
export type OfficialEventUpstreamResponseType = OfficialEventListResponseBase & {
  official_events: OfficialEventType[];
};

// BFF がブラウザへ返す一覧応答。1件は表示に使うぶんだけへ絞られている
export type OfficialEventResponseType = OfficialEventListResponseBase & {
  official_events: OfficialEventListItemType[];
};

/*
 * 一覧がブラウザへ返すフィールド。
 *
 * 上流は1件あたり全フィールドを返すが、一覧は日付単位で全国のイベントを載せるため
 * 土日は1,400件を超え、展開後1MB近くになる。実測(2026-09-13, 1,474件)では未使用の
 * 9フィールド(type_name / regulation_title / csp_flg / capacity / shop_id /
 * prefecture_id / environment_id / standard_regulation_id / standard_regulation_marks)
 * だけで292KB、全体の約38%を占めていた。ブラウザ側の JSON.parse とメモリを
 * 無駄に使うので、BFF で落とす。
 *
 * 中身は一覧の全消費者(記録の作成・編集の公式イベント選択、自由形式の誘導判定、
 * シティリーグ結果の一覧・カード)が使うフィールドの和集合。
 *
 * 下の OfficialEventListItemType はこの配列から導出しているので、ここに足せば
 * 型も実際に返る中身も同時に変わる。型だけ・配列だけを直して食い違うことはない。
 */
export const OFFICIAL_EVENT_LIST_FIELDS = [
  "id",
  "title",
  "address",
  "venue",
  "date",
  "started_at",
  "ended_at",
  "type_id",
  "shop_name",
  "prefecture_name",
  "league_title",
  "environment_title",
] as const satisfies readonly (keyof OfficialEventType)[];

/*
 * 一覧が返す1件。
 *
 * 単品(GET /api/official_events/{id})は従来どおり全フィールドを返すため、
 * この型は単品応答(OfficialEventGetByIdResponseType)の部分型になっている。
 * 一覧で取れたイベントと単品で取り直したイベントを同じ prop に流す箇所
 * (CityleagueResult)は、この型で受ければどちらも渡せる。
 */
export type OfficialEventListItemType = Pick<
  OfficialEventType,
  (typeof OFFICIAL_EVENT_LIST_FIELDS)[number]
>;

export type OfficialEventType = {
  id: number;
  title: string;
  address: string;
  venue: string;
  date: Date;
  started_at: Date;
  ended_at: Date;
  type_id: number;
  type_name: string;
  league_title: string;
  regulation_title: string;
  csp_flg: boolean;
  capacity: number;
  shop_id: number;
  shop_name: string;
  prefecture_id: number;
  prefecture_name: string;
  environment_id: string;
  environment_title: string;
  standard_regulation_id: string;
  standard_regulation_marks: string;
};

export type OfficialEventGetByIdResponseType = OfficialEventType;
