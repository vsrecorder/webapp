import { MatchGetResponseType } from "@app/types/match";

// 対戦一覧から勝敗数を集計する
export function countMatchResults(matches: MatchGetResponseType[]) {
  const wins = matches.filter((m) => m.victory_flg).length;
  const losses = matches.length - wins;
  return { wins, losses, total: matches.length };
}

// 対戦一覧にチーム戦(group_match_flg)が1つでも含まれるか判定する
export function hasGroupMatch(matches: MatchGetResponseType[]) {
  return matches.some((m) => m.group_match_flg);
}

// 対戦一覧にBO3(bo3_flg)が1つでも含まれるか判定する
export function hasBo3Match(matches: MatchGetResponseType[]) {
  return matches.some((m) => m.bo3_flg);
}
