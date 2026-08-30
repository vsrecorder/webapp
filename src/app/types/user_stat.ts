export type UserStatType = {
  user_id: string;
  // 週(月曜始まり)で絞ったときだけ入る。値は週内の指定日 "YYYY-MM-DD"
  week?: string;
  year_month: string;
  environment_id: string;
  season: string;
  regulation_id: string;
  total_records: number;
  official_event_count: number;
  tonamel_event_count: number;
  unofficial_event_count: number;
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number;
};
