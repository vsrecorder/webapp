export type OldestRecordEventDateType = {
  user_id: string;
  deck_id?: string;
  // 該当する対戦記録が1件も無い場合はnull
  event_date: string | null;
};
