export type DesignationType = {
  id: string;
  tier: number;
  code: string;
  emoji: string;
  name: string;
  description: string;
  criteria_type: string;
  criteria_value: number;
};

export type DesignationLadderItemType = DesignationType & {
  achieved: boolean;
  current_value: number;
  // criteria_type が "official_city_league_record"(常連の継続条件)の場合のみ、
  // 前シーズンの集計値。それ以外は常に0。
  previous_value: number;
};

export type UserDesignationType = {
  user_id: string;
  season: string;
  current: DesignationType | null;
  ladder: DesignationLadderItemType[];
};

export type DesignationTierStatType = {
  tier: number;
  user_count: number;
};

export type DesignationRankStatsType = {
  season: string;
  // total_users はいずれかの称号ティアに到達した(=称号なしを除く)ユーザーの合計数
  total_users: number;
  tiers: DesignationTierStatType[];
};
