// デッキ使用率/対面率の円グラフで、出現頻度が低いデッキをまとめて
// 「その他」1件に集約するための共通ロジック。
// 表示数が多すぎるとグラフ・凡例のノイズになるため、対面率がしきい値未満のものと
// 配色数を超える分を「その他」にまとめる。
// ただしそれで「その他」が全体の大半を占めてしまうと分布が読み取れなくなるため、
// otherRateCap を指定した場合はその割合を下回るまで個別表示を増やす。
export type OtherAggregate = {
  count: number;
  usage_rate: number;
  wins: number;
  losses: number;
  win_rate: number;
};

export function groupIntoOther<T extends OtherAggregate>(
  items: T[],
  options: {
    /** この対面率(使用率)未満のデッキを「その他」候補にする */
    threshold: number;
    /** 個別に表示できる最大件数（配色数に合わせる） */
    maxIndividual: number;
    /**
     * 「その他」の合計割合がこの値以上を占める場合、下回るまで個別表示を増やす。
     * 未指定なら拡張しない（maxIndividual で打ち切る従来の挙動）。
     */
    otherRateCap?: number;
    /**
     * otherRateCap を満たすために個別表示を増やせる上限。
     * 未指定なら maxIndividual と同じ（＝拡張しない）。
     */
    expandedMaxIndividual?: number;
    /** 件数(=対面率・使用率)が並んだデッキ同士の並び順。未指定なら元の順序のまま */
    tieBreak?: (a: T, b: T) => number;
    /** 集約結果から「その他」アイテムを組み立てる */
    createOther: (aggregate: OtherAggregate, rest: T[]) => T;
  },
): { displayItems: T[]; hasOther: boolean } {
  const {
    threshold,
    maxIndividual,
    otherRateCap,
    expandedMaxIndividual,
    tieBreak,
    createOther,
  } = options;
  const sorted = [...items].sort(
    (a, b) => b.count - a.count || (tieBreak ? tieBreak(a, b) : 0),
  );

  let cutoff = sorted.findIndex((item) => item.usage_rate < threshold);
  if (cutoff === -1) cutoff = sorted.length;
  cutoff = Math.min(cutoff, maxIndividual);

  // 「その他」が全体の大半を占めると分布として読み取れないため、その場合だけ
  // otherRateCap を下回るまで個別表示を1件ずつ増やす（上限は expandedMaxIndividual）。
  // 分散しきっていて上限まで増やしても下回らない場合は、そこで打ち切る。
  const hardMax = Math.max(maxIndividual, expandedMaxIndividual ?? maxIndividual);
  if (otherRateCap != null) {
    const limit = Math.min(hardMax, sorted.length);
    let otherRate = sorted
      .slice(cutoff)
      .reduce((sum, item) => sum + item.usage_rate, 0);
    while (otherRate >= otherRateCap && cutoff < limit) {
      otherRate -= sorted[cutoff].usage_rate;
      cutoff += 1;
    }
  }

  const rest = sorted.slice(cutoff);
  // まとめても1件しか無いなら「その他」にする意味が無いのでそのまま表示する。
  // ただし個別表示の上限を超えてしまう場合は、たとえ1件でも「その他」にまとめる
  // （上限を超えた数のスプライトを円グラフに並べないため）
  if (rest.length <= 1 && sorted.length <= hardMax) {
    return { displayItems: sorted, hasOther: false };
  }

  const visible = sorted.slice(0, cutoff);
  const wins = rest.reduce((sum, item) => sum + item.wins, 0);
  const losses = rest.reduce((sum, item) => sum + item.losses, 0);
  const matches = wins + losses;

  const other = createOther(
    {
      count: rest.reduce((sum, item) => sum + item.count, 0),
      usage_rate: rest.reduce((sum, item) => sum + item.usage_rate, 0),
      wins,
      losses,
      win_rate: matches > 0 ? wins / matches : 0,
    },
    rest,
  );

  return { displayItems: [...visible, other], hasOther: true };
}
