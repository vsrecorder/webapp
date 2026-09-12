import { MatchGetResponseType, MatchSummaryType } from "@app/types/match";

// 対戦一覧から勝敗数を集計する。
// 両者引き分け(BO3のみ)は勝ちでも負けでもないため、draws として分けて数える。
export function countMatchResults(matches: MatchGetResponseType[]) {
  const wins = matches.filter((m) => m.victory_flg).length;
  const draws = matches.filter((m) => m.draw_flg).length;
  const losses = matches.length - wins - draws;
  return { wins, losses, draws, total: matches.length };
}

// 対戦一覧にチーム戦(group_match_flg)が1つでも含まれるか判定する
export function hasGroupMatch(matches: MatchGetResponseType[]) {
  return matches.some((m) => m.group_match_flg);
}

// 対戦一覧にBO3(bo3_flg)が1つでも含まれるか判定する
export function hasBo3Match(matches: MatchGetResponseType[]) {
  return matches.some((m) => m.bo3_flg);
}

// 対戦一覧を記録カード向けの集計(勝敗数・チーム戦/BO3の有無)にまとめる。
// カードごとに対戦一覧を丸ごと持たず、サーバ側(BFF)でこの形に落としてから渡す
export function summarizeMatches(matches: MatchGetResponseType[]): MatchSummaryType {
  const { wins, losses, draws, total } = countMatchResults(matches);

  return {
    total,
    wins,
    losses,
    draws,
    has_group_match: hasGroupMatch(matches),
    has_bo3: hasBo3Match(matches),
  };
}

// サイド枚数を表示するか判定する。
// サイドは未入力だと 0 - 0 のままになるため、0 - 0 は「入力なし」とみなして表示しない。
// (対戦一覧のチップ・対戦詳細・カレンダーの詳細で同じ判定を使う)
export function hasPrizeCards(
  yourPrizeCards: number | null | undefined,
  opponentsPrizeCards: number | null | undefined,
) {
  return (yourPrizeCards ?? 0) !== 0 || (opponentsPrizeCards ?? 0) !== 0;
}
