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
};

/*
 * 対戦一覧から勝敗数・勝率・勝敗の時系列を集計する。
 * 勝敗は victory_flg を真とする(不戦勝・不戦敗も victory_flg に反映済み)。
 * matches の並び順をそのまま時系列として扱う。
 */
export function summarizeMatches(matches: MatchGetResponseType[]): MatchStats {
  const results: MatchResult[] = matches.map((m) => (m.victory_flg ? "win" : "loss"));
  const wins = results.filter((r) => r === "win").length;
  const total = results.length;
  const losses = total - wins;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  return { wins, losses, total, winRate, results };
}
