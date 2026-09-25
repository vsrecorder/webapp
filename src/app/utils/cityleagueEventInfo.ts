/*
 * シティリーグの開催時間の表示(「09:00 〜 18:00」「09:00 〜」)。
 *
 * 引数は formatJSTTime で整形済みの "HH:mm"(未設定なら空文字)。
 * 上流の終了時刻は未設定だと開催日の 0:00 が入っていることが多い(2026-09-26 の実データで
 * 29 会場中 16 会場)。開始より前(同じか早い)の終了時刻は未設定とみなして出さない。
 * "HH:mm" はゼロ埋めされているので、文字列のまま大小を比べられる。
 */
export function formatEventTimeRange(start: string, end: string): string {
  if (!start) return "";

  if (end && end > start) return `${start} 〜 ${end}`;

  return `${start} 〜`;
}
