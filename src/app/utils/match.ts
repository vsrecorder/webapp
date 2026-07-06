import { MatchGetResponseType } from "@app/types/match";

// 対戦一覧から勝敗数を集計する
export function countMatchResults(matches: MatchGetResponseType[]) {
  const wins = matches.filter((m) => m.victory_flg).length;
  const losses = matches.length - wins;
  return { wins, losses, total: matches.length };
}

// 対戦一覧のうちチーム戦(group_match_flg)が過半数を占めるか判定する
export function isGroupMatchMajority(matches: MatchGetResponseType[]) {
  if (matches.length === 0) return false;
  const groupMatchCount = matches.filter((m) => m.group_match_flg).length;
  return groupMatchCount > matches.length / 2;
}
