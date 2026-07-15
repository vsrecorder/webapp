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
  // 全勝・全敗などで素のφが算出不能になるケースは Haldane–Anscombe 補正で近似値を出す。
  // null になるのはチーム戦の対戦が1件も無い(貢献度が存在しない)ときだけ。
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
 * 素のφは、個人が全勝(または全敗)・チームが全勝(または全敗)のとき、
 * 周辺度数(自分の勝ち数=a+b / 負け数=c+d、チームの勝ち数=a+c / 負け数=b+d)の
 * どれかが0になって分母が0になり、算出できない。ポケカ1記録ぶんの数戦では
 * この偏りが頻繁に起きるため、各セルに0.5を足す Haldane–Anscombe 補正を入れて
 * 常に算出できるようにする。補正はサンプルが少ないほど値を0(中立)側へ寄せるので、
 * 少数戦での過大評価も抑えられる。
 *
 * チーム戦の対戦が1件も無い(a=b=c=d=0)ときだけは、貢献度そのものが
 * 存在しないので補正せず null を返す。
 */
function calcPhi(a: number, b: number, c: number, d: number): number | null {
  if (a + b + c + d === 0) return null;

  // Haldane–Anscombe 補正: 各セルに0.5を足してから相関を計算する。
  // これで周辺度数が0にならず、分母が0になることが無くなる。
  const a2 = a + 0.5;
  const b2 = b + 0.5;
  const c2 = c + 0.5;
  const d2 = d + 0.5;
  const denominator = Math.sqrt((a2 + b2) * (c2 + d2) * (a2 + c2) * (b2 + d2));
  return (a2 * d2 - b2 * c2) / denominator;
}
