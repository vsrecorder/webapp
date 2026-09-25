import { describe, expect, it } from "vitest";

import { isRecentWeek } from "@app/utils/weeklyDeckUsageUpstream";

describe("isRecentWeek", () => {
  // 今週 = 2026-09-21
  it("今週・先週は数字がまだ動く週として扱う", () => {
    expect(isRecentWeek("2026-09-21", "2026-09-21")).toBe(true);
    expect(isRecentWeek("2026-09-14", "2026-09-21")).toBe(true);
  });

  it("それより前の週は集計が確定した週として扱う", () => {
    expect(isRecentWeek("2026-09-07", "2026-09-21")).toBe(false);
  });
});
