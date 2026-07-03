export type UserStreakType = {
  user_id: string;
  current_weeks: number;
  longest_weeks: number;
  freeze_used_count: number;
  max_freeze_count: number;
  last_recorded_week?: string;
};
