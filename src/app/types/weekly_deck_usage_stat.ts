import { MatchPokemonSpriteType } from "@app/types/pokemon_sprite";

// 週次デッキ使用率の集計単位（どこまでを「同じデッキ」として束ねるか）
// - exact:        スプライト（1体目・2体目）の組み合わせが一致するものだけを同じデッキとして扱う
// - first_sprite: 1体目のスプライトが同じものを同じデッキとして扱う
//                 （2体目が違うだけの派生を1行にまとめる）
export type WeeklyDeckUsageGroupingType = "exact" | "first_sprite";

// プラットフォーム全体の週次デッキ使用率における単一のデッキ変種
// （スプライトの集合のみで正規化した指紋。デッキ名等のテキストは使わず、並び順も無視する）
// grouping=first_sprite で集計した場合は、指紋もスプライトも1体目だけになる。
export type WeeklyDeckUsageItemType = {
  fingerprint: string;
  count: number;
  usage_rate: number;
  wins: number;
  losses: number;
  win_rate: number;
  pokemon_sprites: MatchPokemonSpriteType[];
  // この行に束ねられた内訳。アコーディオンで展開して一覧表示するために使う。
  // - 「その他」行: 集約された少数変種
  // - 1体目でまとめた行(grouping=first_sprite): 束ねる前の組み合わせ単位の変種
  // 使用率は行と同じ全体件数が分母のため、内訳の合計が行の使用率に一致する。
  members?: WeeklyDeckUsageItemType[];
  // 前週の同じ指紋の順位・使用率・勝率（上昇/下降表示用）。
  // 前週に指紋が現れていない（新登場）場合は undefined。
  previous_rank?: number;
  previous_usage_rate?: number;
  previous_win_rate?: number;
};

export type WeeklyDeckUsageStatType = {
  week: string;
  week_start: string;
  week_end: string;
  // 実際に集計された単位。リクエストした値ではなくサーバが集計に使った値が返る
  grouping: WeeklyDeckUsageGroupingType;
  total_votes: number;
  contributor_count: number;
  decks: WeeklyDeckUsageItemType[];
};
