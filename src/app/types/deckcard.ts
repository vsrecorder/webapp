export type DeckCardType = {
  card_id: string;
  card_name: string;
  card_count: number;
  detail_url: string;
  image_url: string;
  ability: string;
  attacks: Array<string>;
};

export type PkeCardType = {
  card_id: string;
  card_name: string;
  card_count: number;
  detail_url: string;
  image_url: string;
  ability: string;
  attacks: Array<string>;
};

export type CardType = {
  card_id: string;
  card_name: string;
  card_count: number;
  detail_url: string;
  image_url: string;
};

// ACE SPECカードは1デッキにつき最大1枚。入っていない場合はキー自体が返らない。
export type AceSpecCardType = {
  card_id: string;
  card_name: string;
};

export type DeckCardDetailType = {
  card_pke: PkeCardType[];
  card_pke_count: number;
  card_gds: CardType[];
  card_gds_count: number;
  card_tool: CardType[];
  card_tool_count: number;
  card_tech: CardType[];
  card_tech_count: number;
  card_sup: CardType[];
  card_sup_count: number;
  card_sta: CardType[];
  card_sta_count: number;
  card_ene: CardType[];
  card_ene_count: number;
  card_acespec?: AceSpecCardType;
};

export type DeckCardListType = CardType[];

// デッキの中身をテキストで扱うための要約。
// deckcard-api の詳細(印刷違いも別カード)を、カード名で畳んで枚数順に並べたもの。
export type DeckSummaryCardType = {
  name: string;
  count: number;
};

export type DeckSummaryGroupType = {
  // ポケモン / グッズ / ポケモンのどうぐ / サポート / スタジアム / エネルギー
  label: string;
  count: number;
  cards: DeckSummaryCardType[];
};

export type DeckSummaryType = {
  code: string;
  // 合計枚数(通常は60)
  total: number;
  // デッキの種類の目安になるポケモン名(最大2つ)。選び方は utils/deckSummary.ts
  mainPokemon: string[];
  aceSpec: string | null;
  groups: DeckSummaryGroupType[];
};
