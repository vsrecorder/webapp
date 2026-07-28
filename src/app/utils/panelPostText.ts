import { UserStatType } from "@app/types/user_stat";
import { DeckUsageItemType } from "@app/types/deck_usage_stat";
import { drawCount } from "@app/components/molecules/UserStat/UserStatSummary";
import type { ShareDeckRow } from "@app/components/organisms/DeckUsage/DeckDistributionShareCard";

// ダッシュボードの分析パネルをシェアするときのポスト文。
// いずれも末尾にハッシュタグまで含めた完成形を返す(呼び出し側で足さない)。

const HASHTAG = "#バトレコ";

// 「戦績分析」パネル。勝率と件数の要約を載せる。
export function buildUserStatPostText(
  filterLabel: string,
  stat: UserStatType | null,
): string {
  const winRate = ((stat?.win_rate ?? 0) * 100).toFixed(1);
  const draws = drawCount(stat);
  const record = `${stat?.wins ?? 0}勝${stat?.losses ?? 0}敗${draws > 0 ? `${draws}分` : ""}`;

  return [
    `${filterLabel} の戦績`,
    "",
    `勝率 ${winRate}%（${record}）`,
    `対戦記録 ${stat?.total_records ?? 0}件 / 試合数 ${stat?.total_matches ?? 0}戦`,
    "",
    HASHTAG,
  ].join("\n");
}

// デッキ詳細ページの「シェアする」用ポスト文。デッキ名と勝率・戦績の要約を載せる。
export function buildDeckSummaryPostText(
  deckName: string,
  stat: DeckUsageItemType | null,
): string {
  const hasStats = !!stat && stat.count > 0;

  if (!hasStats) {
    return [`『${deckName}』`, "", HASHTAG].join("\n");
  }

  const winRate = (stat!.win_rate * 100).toFixed(1);
  const record = `${stat!.wins}勝${stat!.losses}敗`;

  return [
    `『${deckName}』の戦績`,
    "",
    `勝率 ${winRate}%（${stat!.count}戦 ${record}）`,
    "",
    HASHTAG,
  ].join("\n");
}

// ポスト文に列挙するデッキの最大数。
// 画像には全件(最大7件)載るため、ポスト文は上位だけにして長くなりすぎないようにする
// (X の文字数制限に収まらないと、そのままではポストできなくなる)。
const MAX_POST_ROWS = 5;

// 「デッキ使用率分析」「対戦相手のデッキ分布」パネル。
// 画像と同じ並び(集約後の表示順)で上位のデッキを列挙する。
export function buildDeckDistributionPostText(
  // 見出し(集計期間などの補足)。改行を含んでいてもよい
  heading: string,
  rows: ShareDeckRow[],
): string {
  const lines = rows
    .slice(0, MAX_POST_ROWS)
    .map((row, idx) => `${idx + 1}. ${row.name} ${(row.usageRate * 100).toFixed(1)}%`);

  return [heading, "", ...lines, "", HASHTAG].join("\n");
}
