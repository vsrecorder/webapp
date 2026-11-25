/*
 * 大型大会の区分ページの骨格(championsleagues/[id]/[league]/loading.tsx)で、要約文に取る行数。
 *
 * 1日目大会と2日目大会に分かれた区分は、要約文に優勝を2人載せるぶん1行長い。
 * 骨格は大会のデータを持たないので、URL にある大会の ID と区分から見当をつける。
 * シニアとジュニアが1日目大会と2日目大会に分かれるようになったのは 2025 シーズンの
 * チャンピオンズリーグから(マスター・オープンと PJCS は分かれない)。
 *
 * 行数は 390px 幅での実測(2026-11-25、本番の全区分ページ)。6行になる14ページはすべてこの条件に入る。
 * 外れても1〜2行ぶんずれるだけなので、新しい大会で1日開催のものが出ても急いで足さなくてよい。
 */
const DEFAULT_LINES = 5;
const SPLIT_LINES = 6;

const SPLIT_FIRST_SEASON = 2025;

// 条件に入るが要約文が5行以下の大会。cl2025_aichi は分かれているが会場名と選手名が短く、
// 他は結果の載っている大会が1つだけ
const NOT_LONGER_SCHEDULE_IDS = new Set([
  "cl2025_aichi",
  "cl2025_fukuoka",
  "cl2025_miyagi",
  "cl2026_fukuoka",
  "cl2027_yokohama",
]);

export function championsleagueSummarySkeletonLines(
  scheduleId: string | null | undefined,
  league: string | null | undefined,
): number {
  if (league !== "senior" && league !== "junior") return DEFAULT_LINES;

  const season = /^cl(\d{4})_/.exec(scheduleId ?? "")?.[1];
  if (!scheduleId || !season || Number(season) < SPLIT_FIRST_SEASON) return DEFAULT_LINES;

  return NOT_LONGER_SCHEDULE_IDS.has(scheduleId) ? DEFAULT_LINES : SPLIT_LINES;
}
