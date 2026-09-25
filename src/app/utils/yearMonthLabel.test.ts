import { describe, expect, it } from "vitest";

import {
  formatLongYearMonth,
  formatShortYearMonth,
  spansMultipleYears,
} from "@app/utils/yearMonthLabel";

describe("spansMultipleYears", () => {
  it("同じ年だけなら false", () => {
    expect(spansMultipleYears(["2026-07", "2026-08"])).toBe(false);
  });

  it("年を跨げば true", () => {
    expect(spansMultipleYears(["2025-12", "2026-01"])).toBe(true);
  });
});

describe("formatShortYearMonth", () => {
  it("年を添えないときは月だけ(先頭の0を落とす)", () => {
    expect(formatShortYearMonth("2026-07", false)).toBe("7月");
  });

  it("年を添えるときは下2桁/月", () => {
    expect(formatShortYearMonth("2025-12", true)).toBe("25/12");
  });
});

describe("formatLongYearMonth", () => {
  it("年と月を省略せずに出す", () => {
    expect(formatLongYearMonth("2026-07")).toBe("2026年7月");
  });
});
