import { describe, expect, it } from "vitest";

import { groupIntoOther, type OtherAggregate } from "@app/utils/deckUsageOther";

type Item = OtherAggregate & { name: string };

function item(name: string, count: number, winRate: number): Item {
  return {
    name,
    count,
    usage_rate: count / 10,
    wins: Math.round(count * winRate),
    losses: count - Math.round(count * winRate),
    win_rate: winRate,
  };
}

const createOther = (aggregate: OtherAggregate): Item => ({
  name: "その他",
  ...aggregate,
});

describe("groupIntoOther", () => {
  it("件数の多い順に並べる", () => {
    const { displayItems, hasOther } = groupIntoOther<Item>(
      [item("A", 2, 0.5), item("B", 5, 0.5), item("C", 3, 0.5)],
      { threshold: 0, maxIndividual: 6, createOther },
    );

    expect(displayItems.map((d) => d.name)).toEqual(["B", "C", "A"]);
    expect(hasOther).toBe(false);
  });

  // 使用率(件数)が並んだときに順番が入力任せだと、同率のデッキが上下に揺れて読みにくい
  it("件数が並んだデッキは tieBreak の順に並べる", () => {
    const { displayItems } = groupIntoOther<Item>(
      [item("A", 3, 0.4), item("B", 3, 0.7), item("C", 3, 0.55)],
      {
        threshold: 0,
        maxIndividual: 6,
        tieBreak: (a, b) => b.win_rate - a.win_rate,
        createOther,
      },
    );

    expect(displayItems.map((d) => d.name)).toEqual(["B", "C", "A"]);
  });

  it("tieBreak 未指定なら件数が並んだデッキは元の順序のまま", () => {
    const { displayItems } = groupIntoOther<Item>(
      [item("A", 3, 0.4), item("B", 3, 0.7)],
      { threshold: 0, maxIndividual: 6, createOther },
    );

    expect(displayItems.map((d) => d.name)).toEqual(["A", "B"]);
  });

  it("しきい値未満のデッキは「その他」にまとめる", () => {
    const { displayItems, hasOther } = groupIntoOther<Item>(
      [item("A", 5, 0.6), item("B", 1, 0.0), item("C", 1, 1.0)],
      { threshold: 0.2, maxIndividual: 6, createOther },
    );

    expect(hasOther).toBe(true);
    expect(displayItems.map((d) => d.name)).toEqual(["A", "その他"]);
    const other = displayItems[1];
    expect(other.count).toBe(2);
    expect(other.win_rate).toBe(0.5);
  });

  it("まとめても1件しか無いなら「その他」にしない", () => {
    const { displayItems, hasOther } = groupIntoOther<Item>(
      [item("A", 5, 0.6), item("B", 1, 0.0)],
      { threshold: 0.2, maxIndividual: 6, createOther },
    );

    expect(hasOther).toBe(false);
    expect(displayItems.map((d) => d.name)).toEqual(["A", "B"]);
  });
});
