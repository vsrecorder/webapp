import { DeckPokemonSpriteType } from "@app/types/pokemon_sprite";

// 投稿者・いいねした人の公開情報。designation_tier は現在の称号ティア(0=称号なし)で、
// 絵文字・名前は utils/designationTier.ts、ランクの画像は utils/designationRank.ts が
// ティアから導出する。
export type DeckCodePostUserType = {
  id: string;
  name: string;
  image_url: string;
  designation_tier: number;
};

// みんなの公開デッキへの投稿1件。デッキ名・スプライト・コードは投稿元のデッキのものを
// バックエンドが埋め込んで返す(投稿用の別名は持たない)。
export type DeckCodePostType = {
  id: string;
  published_at: string;
  // 取り下げ日時。公開中はゼロ値(年が1)。
  unpublished_at: string;
  // 運営が非表示にしているか。投稿者本人向けの応答(デッキの投稿一覧・個別ページ)でだけ true になり得る
  hidden: boolean;
  user: DeckCodePostUserType;
  deck_id: string;
  deck_name: string;
  pokemon_sprites: DeckPokemonSpriteType[];
  deck_code_id: string;
  code: string;
  // 公開時にバックエンドが判定した ACE SPEC。入っていないデッキでは空文字。
  // 画像 URL も一緒に保存してあるので、表示のために acespec API を引き直さない。
  ace_spec_card_id: string;
  ace_spec_card_name: string;
  ace_spec_image_url: string;
  like_count: number;
  liked_by_me: boolean;
  // 直近にいいねした人(最大5人)。アイコンを重ねて出す。
  recent_likers: DeckCodePostUserType[];
};

export type DeckCodePostSort = "new" | "popular";

export type DeckCodePostEnvironmentType = {
  id: string;
  title: string;
  from_date: string;
  to_date: string;
};

export type DeckCodePostGetResponseType = {
  limit: number;
  offset: number;
  sort: DeckCodePostSort;
  // 絞り込みに使った環境。今日に対応する環境が無い場合は null。
  environment: DeckCodePostEnvironmentType | null;
  posts: DeckCodePostType[];
};

export type DeckCodePostGetByIdResponseType = DeckCodePostType;

export type DeckCodePostCreateRequestType = {
  deck_code_id: string;
};

export type DeckCodePostCreateResponseType = DeckCodePostType;

export type DeckCodePostLikeResponseType = DeckCodePostType;

export type DeckCodePostLikerType = {
  user: DeckCodePostUserType;
  created_at: string;
};

export type DeckCodePostGetLikersResponseType = {
  limit: number;
  offset: number;
  likers: DeckCodePostLikerType[];
};

export type DeckCodePostGetByUserIdResponseType = {
  user: DeckCodePostUserType;
  post_count: number;
  like_count_total: number;
  limit: number;
  offset: number;
  posts: DeckCodePostType[];
};

// デッキの公開中の投稿(全バージョン分)。公開スイッチの状態表示に使う。
export type DeckCodePostGetByDeckIdResponseType = DeckCodePostType[];

// ACE SPEC での絞り込み候補1件(公開中の投稿で使われている ACE SPEC と投稿数)。
// 同じカードでも収録セットごとに card_id が違うため、候補も絞り込みもカード名で扱う。
export type DeckCodePostAceSpecCountType = {
  card_name: string;
  image_url: string;
  count: number;
};

export type DeckCodePostGetAceSpecsResponseType = {
  environment: DeckCodePostEnvironmentType | null;
  acespecs: DeckCodePostAceSpecCountType[];
};
