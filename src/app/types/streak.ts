export type UserStreakType = {
  user_id: string;
  current_weeks: number;
  longest_weeks: number;
  freeze_used_count: number;
  max_freeze_count: number;
  // 使用済みフリーズ枠が1つ復活するまでに必要な、残りの連続記録週数(未使用時は0)
  freeze_regen_remaining_weeks: number;
  // フリーズ枠が1つ復活するのに必要なクリーン継続週数(回復周期)
  freeze_regen_weeks: number;
  last_recorded_week?: string;
};
