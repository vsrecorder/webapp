import { describe, expect, it } from "vitest";

import { hasWinRate } from "@app/utils/winRate";

describe("hasWinRate", () => {
  it("勝ちも負けも無ければ勝率を持たない", () => {
    // 対戦が1件も無い
    expect(hasWinRate(0, 0)).toBe(false);
  });

  it("引き分けだけでも勝率を持たない(勝ち0・負け0になる)", () => {
    // 勝率は引き分けを分母から外すので、決着した対戦が無い
    expect(hasWinRate(0, 0)).toBe(false);
  });

  it("勝ちか負けが1件でもあれば勝率を持つ", () => {
    expect(hasWinRate(1, 0)).toBe(true);
    expect(hasWinRate(0, 1)).toBe(true);
    expect(hasWinRate(3, 2)).toBe(true);
  });
});
