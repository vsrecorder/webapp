// プラットフォーム週次デッキ使用率(weekly_usage)に、あるデッキ(スプライト集合)を
// 突き合わせて「環境の中での立ち位置」を求める共通ロジック。
// 施策E-2(環境の窓カード)と施策E-1(記録直後のリターン)で共有する。

import { fingerprintKey } from "@app/utils/fingerprint";
import { lastWeekValue } from "@app/utils/week";
import {
  WeeklyDeckUsageItemType,
  WeeklyDeckUsageStatType,
} from "@app/types/weekly_deck_usage_stat";

// 「ランキング対象」= 「その他」(空指紋)を除いたデッキ変種を、使用率(count)降順・
// 同率は勝率降順に整列して返す。順位はこの並びの index+1。
export function rankableDecks(
  stat: WeeklyDeckUsageStatType,
): WeeklyDeckUsageItemType[] {
  return [...stat.decks.filter((d) => d.fingerprint !== "")].sort(
    (a, b) => b.count - a.count || b.win_rate - a.win_rate,
  );
}

// 「その他」を分母から除いた割合の母数(= total_votes − その他の件数)。
// 使用率を「その他を除いた割合」で表示するときの分母に使う。
export function exclOtherTotalOf(stat: WeeklyDeckUsageStatType): number {
  const otherCount = stat.decks.find((d) => d.fingerprint === "")?.count ?? 0;
  return stat.total_votes - otherCount;
}

export type DeckEnvPosition = {
  rank: number; // 1始まりの環境順位
  row: WeeklyDeckUsageItemType; // 該当デッキの集計行(使用率・勝率など)
  exclOtherTotal: number; // その他除外の母数(使用率表示に使う)
};

// 突き合わせたいデッキのスプライトIDから、環境上の立ち位置を返す。
// 指紋が空(スプライト未設定)か、ランキングに載っていなければ null。
export function findDeckPosition(
  stat: WeeklyDeckUsageStatType,
  spriteIds: string[],
): DeckEnvPosition | null {
  const fp = fingerprintKey(spriteIds);
  if (fp === "") return null;
  const rankable = rankableDecks(stat);
  const idx = rankable.findIndex((d) => d.fingerprint === fp);
  if (idx < 0) return null;
  return { rank: idx + 1, row: rankable[idx], exclOtherTotal: exclOtherTotalOf(stat) };
}

// 施策E-1: 相手デッキのスプライトから、先週の環境での立ち位置を引く。
// - position: ランキングに載っていれば順位情報、圏外なら null
// - hasEnvData: 先週のランキングにデータがあるか(空の週はリターンを出さない)
// スプライト無し・取得失敗なら null(その場合はリターンを出さない)。
// ランキング外の相手でもリターンを出すため、position の有無ではなく hasEnvData で判定する。
export async function fetchOpponentEnv(
  spriteIds: string[],
): Promise<{ position: DeckEnvPosition | null; hasEnvData: boolean } | null> {
  if (spriteIds.length === 0) return null;
  try {
    const res = await fetch(`/api/deck_meta/weekly_usage?week=${lastWeekValue()}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const stat: WeeklyDeckUsageStatType = await res.json();
    return {
      position: findDeckPosition(stat, spriteIds),
      hasEnvData: rankableDecks(stat).length > 0,
    };
  } catch {
    return null;
  }
}
