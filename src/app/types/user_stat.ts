export type UserStatType = {
  user_id: string;
  // 週(月曜始まり)で絞ったときだけ入る。値は週内の指定日 "YYYY-MM-DD"
  week?: string;
  year_month: string;
  environment_id: string;
  season: string;
  regulation_id: string;
  // この数字が不戦勝・不戦敗を外して集計されたものか(utils/excludeDefaultMatches)。
  // 上流が古い間は届かないので任意にしてある
  exclude_default_matches?: boolean;
  total_records: number;
  official_event_count: number;
  tonamel_event_count: number;
  unofficial_event_count: number;
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number;
};
