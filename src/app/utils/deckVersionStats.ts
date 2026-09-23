import { DeckCodeUsageItemType } from "@app/types/deck_usage_stat";

// バージョンごとの勝率を出し始める対戦数(引き分けを除いた勝ち+負け)。
// 1バージョンあたりの対戦は数戦にとどまりやすく、2戦2勝で「100%」と出すと
// 一番勝てた版を取り違えるため、ある程度たまるまでは戦績だけを見せる。
export const MIN_MATCHES_FOR_VERSION_WIN_RATE = 5;

export function decidedMatches(item: DeckCodeUsageItemType): number {
  return item.wins + item.losses;
}

export function hasEnoughMatchesForWinRate(item: DeckCodeUsageItemType): boolean {
  return decidedMatches(item) >= MIN_MATCHES_FOR_VERSION_WIN_RATE;
}

// 「最高勝率」の印を付けるバージョンを選ぶ。
// versionIds は画面に並べるバージョン(新しい順)。削除済みのバージョンの成績は候補にしない。
// 勝率を出せるバージョンが2つ以上ないと比べる相手がいないので、印は付けない(null)。
// 同じ勝率なら対戦数の多いほう、それも同じなら新しいほうを選ぶ。
export function pickBestVersionId(
  items: DeckCodeUsageItemType[],
  versionIds: string[],
): string | null {
  const byId = new Map(items.map((item) => [item.deck_code_id, item]));

  const candidates = versionIds
    .map((id) => byId.get(id))
    .filter((item): item is DeckCodeUsageItemType => !!item && hasEnoughMatchesForWinRate(item));

  if (candidates.length < 2) return null;

  let best = candidates[0];
  for (const item of candidates.slice(1)) {
    if (
      item.win_rate > best.win_rate ||
      (item.win_rate === best.win_rate && decidedMatches(item) > decidedMatches(best))
    ) {
      best = item;
    }
  }

  return best.deck_code_id;
}
