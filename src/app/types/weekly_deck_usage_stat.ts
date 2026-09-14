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
  // 「その他」枠に集約された個別変種の内訳（「その他」行のみ）。
  // 少数変種もアコーディオンで展開して個別に一覧表示するために使う。
  members?: WeeklyDeckUsageItemType[];
  // 前週の同じ指紋の順位・使用率・勝率（上昇/下降表示用）。
  // 前週に指紋が現れていない（新登場）場合は undefined。
  previous_rank?: number;
  previous_usage_rate?: number;
  previous_win_rate?: number;
  // 前週の「その他を除いた分母」での使用率（「その他を除いた割合」表示の前週差用）。
  previous_usage_rate_excl_other?: number;
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
