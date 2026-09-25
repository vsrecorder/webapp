import { hasWinRate } from "@app/utils/winRate";

import { UserStatType } from "@app/types/user_stat";
import { UserStatMonthlyType } from "@app/types/user_stat_history";
import { DeckUsageItemType } from "@app/types/deck_usage_stat";
import { drawCount } from "@app/components/molecules/UserStat/UserStatSummary";
import type { ShareDeckRow } from "@app/components/organisms/DeckUsage/DeckDistributionShareCard";
import { formatShortYearMonth, spansMultipleYears } from "@app/utils/yearMonthLabel";

// ダッシュボードの分析パネルをシェアするときのポスト文。
// いずれも末尾にハッシュタグまで含めた完成形を返す(呼び出し側で足さない)。

const HASHTAG = "#バトレコ";

/*
 * 「戦績分析」パネル。勝率と件数の要約を載せる。
 *
 * 不戦勝・不戦敗を外して集計しているかどうかはポスト文に書かない。
 * ポストは読み手に数字を見せるもので、集計条件の但し書きは字数を食うわりに伝わらない
 * (シェア画像の側には出してある)。デッキのシェア文も同じ扱い。
 */
export function buildUserStatPostText(
  filterLabel: string,
  stat: UserStatType | null,
): string {
  const draws = drawCount(stat);
  const record = `${stat?.wins ?? 0}勝${stat?.losses ?? 0}敗${draws > 0 ? `${draws}分` : ""}`;
  const counts = `対戦記録 ${stat?.total_records ?? 0}件 / 試合数 ${stat?.total_matches ?? 0}戦`;

  // 勝ちも負けも無い期間は勝率が存在しないので、その行ごと落とす
  // (0.0% と書くと全敗と読めてしまう)。デッキのシェア文も同じ扱い。
  if (!hasWinRate(stat?.wins ?? 0, stat?.losses ?? 0)) {
    return [`${filterLabel} の戦績`, "", counts, "", HASHTAG].join("\n");
  }

  const winRate = ((stat?.win_rate ?? 0) * 100).toFixed(1);

  return [
    `${filterLabel} の戦績`,
    "",
    `勝率 ${winRate}%（${record}）`,
    counts,
    "",
    HASHTAG,
  ].join("\n");
}

// デッキ詳細ページの「シェアする」用ポスト文。デッキ名と勝率・戦績の要約を載せる。
// 集計条件の但し書きを入れない理由は buildUserStatPostText と同じ。
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
// 画像には集約後の全件(「その他」まで含めて最大11件)が載るため、ポスト文は上位だけにして
// 長くなりすぎないようにする
// (X の文字数制限に収まらないと、そのままではポストできなくなる)。
const MAX_POST_ROWS = 5;

// 「デッキ使用率分析」「対戦相手のデッキ分析」パネル。
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

// ポスト文に列挙する月の最大数。シーズン表示では最大12ヶ月並ぶが、
// 全部載せると X の文字数制限に収まらないため、新しい月から数えてこの数までにする
// (画像には全部の月が載る)。
const MAX_POST_MONTHS = 6;

/*
 * 「月毎の勝率推移」パネル。月ごとの勝率と勝敗を新しい月まで順に並べる。
 * 勝ちも負けも無い月は勝率が存在しないので「-」にする(0.0% だと全敗と読めてしまう)。
 * 集計条件の但し書きを入れない理由は buildUserStatPostText と同じ。
 */
export function buildUserStatHistoryPostText(
  // 見出し(集計期間・デッキなどの補足)。改行を含んでいてもよい
  heading: string,
  months: UserStatMonthlyType[],
): string {
  const recent = months.slice(-MAX_POST_MONTHS);
  // 年の表記は載せる月だけで決める(落とした古い月の年に引きずられない)
  const withYear = spansMultipleYears(recent.map((m) => m.year_month));

  const lines = recent.map((m) => {
    const label = formatShortYearMonth(m.year_month, withYear);
    const rate = hasWinRate(m.wins, m.losses) ? `${(m.win_rate * 100).toFixed(1)}%` : "-";
    return `${label} ${rate}（${m.wins}勝${m.losses}敗）`;
  });

  return [heading, "", ...lines, "", HASHTAG].join("\n");
}
