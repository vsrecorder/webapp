// プリセットタグの群。付与先ごとに見せるプリセットを切り替えるために使う。
// - acespec  : ACE SPECカード。デッキ・デッキコード・対戦結果に付ける
// - placement: 大会順位(優勝・ベスト4 など)。記録に付ける
// バックエンドの GET /tags/presets?category=... に渡す値と一致させる。
export type TagPresetCategory = "acespec" | "placement";

// タグ。ユーザーごとの名前空間を持ち、デッキ・デッキコード・記録・対戦結果に
// 付与できるラベル。付与先のレスポンスには TagType の配列(tags)として埋め込まれる。
export type TagType = {
  id: string;
  created_at: Date;
  name: string;
  // '#RRGGBB' 形式。未設定のときは空文字。
  color: string;
  // color の上に乗せる文字色('#RRGGBB' 形式)。配色まで決めたいプリセット用。
  // 空のときは color の明るさから決める(utils/tagColor.ts)。
  text_color: string;
  // true は運営が用意する全ユーザー共通のプリセットタグ(例: ACE SPEC・大会順位)。
  // ユーザーは付与できるが編集・削除はできない。UIでは別枠で表示する。
  preset_flg: boolean;
};

export type TagCreateRequestType = {
  name: string;
  color: string;
};

export type TagUpdateRequestType = {
  name: string;
  color: string;
};

export type TagGetResponseType = TagType[];

export type TagCreateResponseType = TagType;

export type TagUpdateResponseType = TagType;
