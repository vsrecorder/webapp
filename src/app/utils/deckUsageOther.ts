// デッキ使用率/対面率の円グラフで、出現頻度が低いデッキをまとめて
// 「その他」1件に集約するための共通ロジック。
// 表示数が多すぎるとグラフ・凡例のノイズになるため、対面率がしきい値未満のものと
// 配色数を超える分を「その他」にまとめる。
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
    /** 集約結果から「その他」アイテムを組み立てる */
    createOther: (aggregate: OtherAggregate, rest: T[]) => T;
  },
): { displayItems: T[]; hasOther: boolean } {
  const { threshold, maxIndividual, createOther } = options;
  const sorted = [...items].sort((a, b) => b.count - a.count);

  let cutoff = sorted.findIndex((item) => item.usage_rate < threshold);
  if (cutoff === -1) cutoff = sorted.length;
  cutoff = Math.min(cutoff, maxIndividual);

  const rest = sorted.slice(cutoff);
  // まとめても1件しか無いなら「その他」にする意味が無いのでそのまま表示する
  if (rest.length <= 1) {
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
