import { MatchGetResponseType } from "@app/types/match";

// 記録IDに紐づく対戦一覧を取得する。
// 記録詳細ページ・記録情報モーダルで、戦績集計と対戦結果表示の共通データソースとして使う。
export async function fetchMatchesByRecordId(
  recordId: string,
): Promise<MatchGetResponseType[]> {
  const res = await fetch(`/api/records/${recordId}/matches`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch");
  }
  return res.json();
}

export type MatchResult = "win" | "loss";

// チーム戦(group_match_flg)の対戦だけを集計した、チームとしての勝敗。
// チーム戦を含まない記録では total が 0 になる。
export type TeamStats = {
  // チームの勝ち数
  wins: number;
  // チームの負け数
  losses: number;
  // チーム戦の対戦数
  total: number;
  // チームの勝率(0〜100の整数。チーム戦0件のときは0)
  winRate: number;

  // ---- 個人の勝敗 × チームの勝敗 のクロス集計(チーム戦の対戦のみ) ----
  // 自分もチームも勝ち
  bothWin: number;
  // 自分は勝ったがチームは負け(チームメイトが取りこぼした)
  soloWinTeamLoss: number;
  // 自分は負けたがチームは勝ち(チームメイトに救われた)
  soloLossTeamWin: number;
  // 自分もチームも負け
  bothLoss: number;

  // φ係数(-1〜+1)。個人の勝敗とチームの勝敗の相関で、チーム結果への貢献度の代理指標。
  // +1に近い = 自分が勝った試合ほどチームも勝っている、-1に近い = 逆に噛み合っていない。
  // 全勝・全敗などで周辺度数が偏り分母が0になる場合は算出できないので null。
  phi: number | null;
};

export type MatchStats = {
  // 勝ち数
  wins: number;
  // 負け数
  losses: number;
  // 総対戦数
  total: number;
  // 勝率(0〜100の整数。総対戦数0のときは0)
  winRate: number;
  // 勝敗の時系列(1戦目 → 最終戦の順)
  results: MatchResult[];
  // チームとしての勝敗(チーム戦の対戦のみ)
  team: TeamStats;
};

/*
 * 対戦一覧から勝敗数・勝率・勝敗の時系列を集計する。
 * 勝敗は victory_flg を真とする(不戦勝・不戦敗も victory_flg に反映済み)。
 * matches の並び順をそのまま時系列として扱う。
 *
 * チーム戦の記録では、個人の勝敗(victory_flg)とチームの勝敗
 * (group_match_victory_flg)が食い違いうる(自分は勝ったがチームは負けた 等)ため、
 * チーム側は別軸として team に集計する。個人側(wins/losses/winRate)は記録全体が
 * 対象で、チーム側はチーム戦の対戦だけが対象になる(分母が異なりうる)。
 */
export function summarizeMatches(matches: MatchGetResponseType[]): MatchStats {
  const results: MatchResult[] = matches.map((m) => (m.victory_flg ? "win" : "loss"));
  const wins = results.filter((r) => r === "win").length;
  const total = results.length;
  const losses = total - wins;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const teamMatches = matches.filter((m) => m.group_match_flg);
  const teamTotal = teamMatches.length;
  const teamWins = teamMatches.filter((m) => m.group_match_victory_flg).length;
  const teamLosses = teamTotal - teamWins;
  const teamWinRate = teamTotal > 0 ? Math.round((teamWins / teamTotal) * 100) : 0;

  // 個人×チームのクロス集計。個人側はチーム戦の対戦のみを対象にする
  // (記録全体の wins/losses とは分母が異なりうる)。
  const bothWin = teamMatches.filter(
    (m) => m.victory_flg && m.group_match_victory_flg,
  ).length;
  const soloWinTeamLoss = teamMatches.filter(
    (m) => m.victory_flg && !m.group_match_victory_flg,
  ).length;
  const soloLossTeamWin = teamMatches.filter(
    (m) => !m.victory_flg && m.group_match_victory_flg,
  ).length;
  const bothLoss = teamMatches.filter(
    (m) => !m.victory_flg && !m.group_match_victory_flg,
  ).length;

  return {
    wins,
    losses,
    total,
    winRate,
    results,
    team: {
      wins: teamWins,
      losses: teamLosses,
      total: teamTotal,
      winRate: teamWinRate,
      bothWin,
      soloWinTeamLoss,
      soloLossTeamWin,
      bothLoss,
      phi: calcPhi(bothWin, soloWinTeamLoss, soloLossTeamWin, bothLoss),
    },
  };
}

/*
 * 2値×2値のφ係数(ピアソン相関の2値版 / MCC)を求める。
 *
 *   φ = (ad - bc) / √((a+b)(c+d)(a+c)(b+d))
 *
 * a=自分◯チーム◯ / b=自分◯チーム✕ / c=自分✕チーム◯ / d=自分✕チーム✕
 *
 * 個人が全勝(または全敗)、チームが全勝(または全敗)のときは分母が0になり、
 * 相関そのものが定義できない(片方が動いていないので連動を測れない)ため null を返す。
 */
function calcPhi(a: number, b: number, c: number, d: number): number | null {
  const denominator = Math.sqrt((a + b) * (c + d) * (a + c) * (b + d));
  if (denominator === 0) return null;
  return (a * d - b * c) / denominator;
}
