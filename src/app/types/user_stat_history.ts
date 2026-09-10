export type UserStatMonthlyType = {
  year_month: string;
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number;
};

export type UserStatHistoryType = {
  user_id: string;
  period: string;
  season: string;
  deck_id?: string;
  // 不戦勝・不戦敗を外して集計されたものか(user_stat.ts と同じ)
  exclude_default_matches?: boolean;
  history: UserStatMonthlyType[];
};
