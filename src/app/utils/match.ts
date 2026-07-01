import { MatchGetResponseType } from "@app/types/match";

// 対戦一覧から勝敗数を集計する
export function countMatchResults(matches: MatchGetResponseType[]) {
  const wins = matches.filter((m) => m.victory_flg).length;
  const losses = matches.length - wins;
  return { wins, losses, total: matches.length };
}
