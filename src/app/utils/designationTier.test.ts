import { describe, expect, it } from "vitest";

import { DESIGNATION_TIERS, designationForTier } from "@app/utils/designationTier";

describe("designationForTier", () => {
  it("ティア 1〜10 は定義どおりの称号を返す", () => {
    expect(designationForTier(4)).toEqual({ tier: 4, emoji: "🎫", name: "レギュラー" });
    expect(designationForTier(8)?.name).toBe("名人");
    expect(DESIGNATION_TIERS.map((d) => d.tier)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("0(称号なし)や未知の値は null", () => {
    expect(designationForTier(0)).toBeNull();
    expect(designationForTier(11)).toBeNull();
    expect(designationForTier(-1)).toBeNull();
  });
});
