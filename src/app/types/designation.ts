export type DesignationType = {
  id: string;
  tier: number;
  code: string;
  emoji: string;
  name: string;
  description: string;
  criteria_type: string;
  criteria_value: number;
  // criteria_type が "official_city_league_record"(レギュラーの継続条件)の場合のみ、
  // 前シーズンの実績を問わず今シーズン単独で達成とみなす閾値。それ以外は常に0。
  standalone_threshold: number;
};

export type DesignationLadderItemType = DesignationType & {
  achieved: boolean;
  current_value: number;
  // criteria_type が "official_city_league_record"(レギュラーの継続条件)の場合のみ、
  // 前シーズンの集計値。それ以外は常に0。
  previous_value: number;
  // criteria_type が "official_city_league_placement"(ベテラン)・
  // "official_city_league_playoff"(熟練)・"official_city_league_champion"(達人)の
  // いずれかかつ achieved が false の場合のみ、
  // 未達成の原因が「公式サイトの結果はあるが、対応する大会の記録をまだ作成していないこと」
  // であるかを表す。それ以外は常にfalse。
  missing_official_event_record: boolean;
  // criteria_type が "official_city_league_placement"(ベテラン)・
  // "official_city_league_playoff"(熟練)・"official_city_league_champion"(達人)・
  // "official_city_league_grandmaster"(名人)の
  // いずれかの場合のみ、プレイヤーズクラブ未連携で
  // あるにもかかわらず、対象シーズン内にシティリーグの記録を既に作成済みであるかを表す。
  // それ以外、またはプレイヤーズクラブ連携済みの場合は常にfalse。
  city_league_record_without_player_link: boolean;
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
