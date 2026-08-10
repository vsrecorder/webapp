// タグ。ユーザーごとの名前空間を持ち、デッキやデッキコード(将来は記録・対戦結果)に
// 付与できるラベル。付与先のレスポンスには TagType の配列(tags)として埋め込まれる。
export type TagType = {
  id: string;
  created_at: Date;
  name: string;
  // '#RRGGBB' 形式。未設定のときは空文字。
  color: string;
  // true は運営が用意する全ユーザー共通のプリセットタグ(例: ACE SPEC)。
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
