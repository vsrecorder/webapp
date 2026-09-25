import { MatchPokemonSpriteType } from "@app/types/pokemon_sprite";

// 対戦環境分析の「使用率順位の推移」(1体目でまとめた集計を週ごとに並べたもの)。
// 週次デッキ使用率(weekly_deck_usage_stat)を複数週ぶん取り、BFF で組み立てる。

// 推移に含めた1週ぶんの情報
export type WeeklyDeckUsageTrendWeekType = {
  // 週の月曜日 "YYYY-MM-DD"
  week: string;
  week_start: string;
  week_end: string;
  total_votes: number;
};

// 1体目のポケモン1系列の、ある週の値
export type WeeklyDeckUsageTrendPointType = {
  // 使用率ランキングの順位(「その他」を除いた個別行の中での順位)。
  // 「その他」へ集約された週・その週に1件も無かった週は null。
  rank: number | null;
  // 使用率(全体件数が分母)。その週に1件も無ければ null。
  // 「その他」に集約された週も内訳の値を入れる(圏外でもどのくらい使われたかを出すため)。
  usage_rate: number | null;
  count: number;
};

export type WeeklyDeckUsageTrendSeriesType = {
  fingerprint: string;
  // 1体目のスプライト(1件)
  pokemon_sprites: MatchPokemonSpriteType[];
  // weeks と同じ並び(古い週が先頭)
  points: WeeklyDeckUsageTrendPointType[];
};

export type WeeklyDeckUsageTrendType = {
  // 線を引く順位の範囲(上位 limit 位)
  limit: number;
  // 古い週が先頭
  weeks: WeeklyDeckUsageTrendWeekType[];
  // いずれかの週で上位 limit 位に入った系列。最新週の順位順(圏外は最高順位の順で後ろへ)
  series: WeeklyDeckUsageTrendSeriesType[];
};
