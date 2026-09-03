// チャンピオンズリーグ / PJCS などの大型大会1つ分（championsleague_schedules）。
// シティリーグの「シーズン」に相当する期間ではなく、1大会の会期（1〜3日）を表す。
export type ChampionsleagueScheduleType = {
  id: string;
  title: string;
  from_date: Date;
  to_date: Date;
};
