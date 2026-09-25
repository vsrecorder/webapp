import { describe, expect, it } from "vitest";

import { isValleyPoint } from "@app/components/molecules/Share/ShareWinRateLineChart";

describe("isValleyPoint", () => {
  it("両隣より低い点は谷", () => {
    expect(isValleyPoint([70, 33, 81], 1)).toBe(true);
  });

  it("片側が同じ高さでも、もう片側が高ければ谷", () => {
    expect(isValleyPoint([81, 50, 50], 1)).toBe(true);
  });

  it("両隣と同じ高さなら谷ではない", () => {
    expect(isValleyPoint([50, 50, 50], 1)).toBe(false);
  });

  it("山や上り坂の途中は谷ではない", () => {
    expect(isValleyPoint([33, 81, 50], 1)).toBe(false);
    expect(isValleyPoint([30, 50, 70], 1)).toBe(false);
  });

  it("端の点は隣の1点だけで判断する", () => {
    expect(isValleyPoint([50, 70], 0)).toBe(true);
    expect(isValleyPoint([70, 50], 1)).toBe(true);
    expect(isValleyPoint([70, 50], 0)).toBe(false);
  });

  it("1点だけなら谷ではない", () => {
    expect(isValleyPoint([50], 0)).toBe(false);
  });
});
