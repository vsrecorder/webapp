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
  history: UserStatMonthlyType[];
};
