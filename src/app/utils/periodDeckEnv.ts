// プラットフォーム全体のデッキ使用率を、ふりかえりの対象期間で合算して求める。
//
// 週次の集計(/api/deck_meta/weekly_usage)しか無いため、その期間に属する週を並列で
// 取得して指紋(fingerprint)ごとに件数を足し合わせる。レポートの「あなたが当たった割合」と
// 「環境全体での使用率」を同じ期間で比べるために使う。
//
// ★ 週と期間の境界は一致しない。ここでは「起点の月曜日が期間内にある週」を対象とするため、
//    期間の端の数日は隣の週に含まれる。厳密な期間集計ではなく「その期間のおおよその環境」
//    として扱い、カード側でも母数(のべ件数)を必ず併記すること。

import { fingerprintKey } from "@app/utils/fingerprint";
import { currentWeekValue } from "@app/utils/week";
import { periodDateRange, type RecapPeriod } from "@app/utils/recapPeriod";
import { WeeklyDeckUsageStatType } from "@app/types/weekly_deck_usage_stat";

// 一度に投げる週の上限。環境は3〜4ヶ月あり、全週を引くとリクエストが増えすぎるため、
// 超える場合は新しい方から拾う（直近の環境像を優先する）。
const MAX_WEEKS = 16;

export type PeriodDeckEnv = {
  // 実際に集計できた週数（データが無い週は含まない）
  weeks: number;
  // 合算したのべ対戦数（「その他」を含む全体件数）
  totalVotes: number;
  // 指紋ごとの件数。使用率は count / totalVotes で求める
  countByFingerprint: Map<string, number>;
};

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 期間内に起点(月曜日)がある週を古い順に返す。今週より後の週は集計対象が無いため除く。
function mondaysInRange(from: Date, to: Date): string[] {
  const limit = currentWeekValue();
  const mondays: string[] = [];

  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  // getDay: 日曜=0 ... 土曜=6。期間開始日以降の最初の月曜まで進める
  while (cursor.getDay() !== 1) cursor.setDate(cursor.getDate() + 1);

  while (cursor <= to) {
    const value = formatDate(cursor);
    if (value > limit) break;
    mondays.push(value);
    cursor.setDate(cursor.getDate() + 7);
  }

  return mondays.slice(-MAX_WEEKS);
}

async function fetchWeek(week: string): Promise<WeeklyDeckUsageStatType | null> {
  try {
    const res = await fetch(`/api/deck_meta/weekly_usage?week=${week}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// 指定期間の環境データを取得する。1週も取れなければ null（カード側で比較を出さない）。
export async function fetchPeriodDeckEnv(
  period: RecapPeriod,
): Promise<PeriodDeckEnv | null> {
  const { from, to } = periodDateRange(period);
  const weeks = mondaysInRange(from, to);
  if (weeks.length === 0) return null;

  const stats = (await Promise.all(weeks.map(fetchWeek))).filter(
    (stat): stat is WeeklyDeckUsageStatType => stat !== null,
  );

  const countByFingerprint = new Map<string, number>();
  let totalVotes = 0;
  let collected = 0;

  for (const stat of stats) {
    // 件数が入っていない週（未集計・データ無し）は週数に数えない
    if (stat.total_votes <= 0) continue;
    collected++;
    totalVotes += stat.total_votes;

    for (const deck of stat.decks) {
      // 「その他」(空の指紋)は母数には含まれるが、個別の突合には使えないため足さない
      if (deck.fingerprint === "") continue;
      countByFingerprint.set(
        deck.fingerprint,
        (countByFingerprint.get(deck.fingerprint) ?? 0) + deck.count,
      );
    }
  }

  if (collected === 0 || totalVotes === 0) return null;

  return { weeks: collected, totalVotes, countByFingerprint };
}

// スプライトの集合から、その期間の環境全体での使用率(0〜1)を引く。
// 指紋が空、または環境に現れていない（圏外の）デッキは null。
export function envUsageRate(env: PeriodDeckEnv, spriteIds: string[]): number | null {
  const fp = fingerprintKey(spriteIds);
  if (fp === "") return null;

  const count = env.countByFingerprint.get(fp);
  if (count === undefined) return null;

  return count / env.totalVotes;
}
