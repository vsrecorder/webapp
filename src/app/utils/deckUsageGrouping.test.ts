import { describe, expect, it } from "vitest";

import {
  DEFAULT_DECK_USAGE_GROUPING,
  normalizeDeckUsageGrouping,
} from "@app/utils/deckUsageGrouping";

describe("normalizeDeckUsageGrouping", () => {
  it("1枚目でまとめる集計単位はそのまま返す", () => {
    expect(normalizeDeckUsageGrouping("first_sprite")).toBe("first_sprite");
  });

  it("組み合わせ別の集計単位はそのまま返す", () => {
    expect(normalizeDeckUsageGrouping("exact")).toBe("exact");
  });

  it("未指定は既定の集計単位になる", () => {
    expect(normalizeDeckUsageGrouping(null)).toBe(DEFAULT_DECK_USAGE_GROUPING);
    expect(normalizeDeckUsageGrouping(undefined)).toBe(DEFAULT_DECK_USAGE_GROUPING);
    expect(normalizeDeckUsageGrouping("")).toBe(DEFAULT_DECK_USAGE_GROUPING);
  });

  // URLを手で書き換えられても core-api の 400 に当てず、既定で表示できるようにする
  it("未知の値は既定の集計単位になる", () => {
    expect(normalizeDeckUsageGrouping("first")).toBe(DEFAULT_DECK_USAGE_GROUPING);
  });
});
