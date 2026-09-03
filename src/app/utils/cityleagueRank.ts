// シティリーグ入賞の順位表示。cityleague_results.rank は「その順位帯の先頭の順位」で
// 入っている(ベスト8なら5、ベスト16なら9)ため、そのまま数字として出さずラベルに変換する。
//
// 入賞一覧のカード(CityleagueResultCard)と、トレーナー情報ページの
// 「入賞したシティリーグ」(PlayerCityleagueResults)で同じ見え方にするため、
// ラベルと塗り色をここに集約している。

const RANK_LABELS: Record<number, { label: string; medal: string }> = {
  1: { label: "優勝", medal: "🥇" },
  2: { label: "準優勝", medal: "🥈" },
  3: { label: "ベスト4", medal: "🥉" },
  5: { label: "ベスト8", medal: "" },
  9: { label: "ベスト16", medal: "" },
};

// 順位ラベル。定義の無い順位では空文字を返す(呼び出し側でバッジごと出さない)。
export function cityleagueRankLabel(rank: number, withMedal: boolean): string {
  const entry = RANK_LABELS[rank];
  if (!entry) return "";

  return withMedal && entry.medal ? `${entry.medal} ${entry.label}` : entry.label;
}

// 順位バッジの塗り色。絵文字メダルに加え、背景色でも順位を区別できるようにする。
export function cityleagueRankBadgeClass(rank: number): string {
  switch (rank) {
    case 1:
      return "bg-amber-400 text-amber-950";
    case 2:
      return "bg-zinc-300 text-zinc-800";
    case 3:
      return "bg-orange-400 text-orange-950";
    case 5:
      return "bg-blue-500 text-white";
    case 9:
      return "bg-emerald-500 text-white";
    default:
      return "bg-default-200 text-default-700";
  }
}

// 入賞カードの枠色。順位バッジと合わせてカード全体でも順位が伝わるようにする。
export function cityleagueRankBorderClass(rank: number): string {
  switch (rank) {
    case 1:
      // ダークモードでは淡色背景に白文字が埋もれるため、背景を暗いトーンに切り替える
      return "border-amber-400 bg-amber-50 dark:bg-amber-900/30";
    case 2:
      return "border-default-400 bg-default-100";
    case 3:
      return "border-orange-700 bg-orange-100 dark:bg-orange-900/30";
    case 5:
      return "border-blue-500 bg-blue-50 dark:bg-blue-900/30";
    case 9:
      // 順位バッジ(cityleagueRankBadgeClass)のベスト16が emerald なので枠も揃える。
      return "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30";
    default:
      return "";
  }
}

// cityleague_results.league_type のリーグ名(official_events.league_title と同じ区分)。
export function cityleagueLeagueTitle(leagueType: number): string {
  switch (leagueType) {
    case 1:
      return "オープン";
    case 2:
      return "ジュニア";
    case 3:
      return "シニア";
    case 4:
      return "マスター";
    default:
      return "";
  }
}

// 順位ごとのセクション。入賞一覧を「優勝 / 準優勝 / ベスト4 …」で区切るために使う。
// accent は枠色(cityleagueRankBorderClass)と揃えた見出しの色帯。
const RANK_SECTIONS: { rank: number; label: string; accent: string }[] = [
  { rank: 1, label: "🥇 優勝", accent: "bg-amber-400" },
  { rank: 2, label: "🥈 準優勝", accent: "bg-default-400" },
  { rank: 3, label: "🥉 ベスト4", accent: "bg-orange-700" },
  { rank: 5, label: "ベスト8", accent: "bg-blue-500" },
  { rank: 9, label: "ベスト16", accent: "bg-emerald-500" },
];

export type RankSection<T> = {
  key: string;
  label: string;
  accent: string;
  results: T[];
};

/**
 * 入賞を順位ごとのセクションに畳む。
 *
 * rank は「その順位帯の先頭の順位」で入っている(ベスト8なら5)が、大会によっては
 * 10〜16位が個別に入ることもあるため、定義外の順位も「N位」として取りこぼさない。
 *
 * シティリーグの個別イベントページと大型大会の大会ページで同じ区切り方をするため、
 * ここに集約している。
 */
export function buildRankSections<T extends { rank: number }>(
  results: T[],
): RankSection<T>[] {
  const rest = new Map<number, T[]>();

  for (const result of results) {
    const list = rest.get(result.rank) ?? [];
    list.push(result);
    rest.set(result.rank, list);
  }

  const sections: RankSection<T>[] = [];

  for (const { rank, label, accent } of RANK_SECTIONS) {
    const matched = rest.get(rank);
    if (!matched?.length) continue;

    sections.push({ key: String(rank), label, accent, results: matched });
    rest.delete(rank);
  }

  for (const [rank, matched] of [...rest.entries()].sort((a, b) => a[0] - b[0])) {
    sections.push({
      key: String(rank),
      label: `${rank}位`,
      accent: "bg-default-300",
      results: matched,
    });
  }

  return sections;
}
