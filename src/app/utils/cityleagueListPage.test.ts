import { describe, expect, it } from "vitest";

import {
  CITYLEAGUE_SEARCH_DAYS,
  buildSearchDates,
  shiftDateString,
} from "@app/utils/cityleagueListPage";

describe("shiftDateString", () => {
  it("前後に日をずらす", () => {
    expect(shiftDateString("2026-05-06", -1)).toBe("2026-05-05");
    expect(shiftDateString("2026-05-06", 1)).toBe("2026-05-07");
    expect(shiftDateString("2026-05-06", 0)).toBe("2026-05-06");
  });

  it("月初・年をまたぐ", () => {
    expect(shiftDateString("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDateString("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("うるう年の2月をまたぐ", () => {
    expect(shiftDateString("2024-03-01", -1)).toBe("2024-02-29");
  });
});

describe("buildSearchDates", () => {
  it("起点から1日ずつ遡って最大14日ぶん返す", () => {
    const dates = buildSearchDates("2026-05-06", null);

    expect(dates).toHaveLength(CITYLEAGUE_SEARCH_DAYS);
    expect(dates[0]).toBe("2026-05-06");
    expect(dates[1]).toBe("2026-05-05");
    expect(dates[CITYLEAGUE_SEARCH_DAYS - 1]).toBe("2026-04-23");
  });

  it("スケジュールの開始日より前は含めない", () => {
    const dates = buildSearchDates("2026-05-06", "2026-05-04");

    expect(dates).toEqual(["2026-05-06", "2026-05-05", "2026-05-04"]);
  });

  it("起点がスケジュールの開始日より前なら空", () => {
    expect(buildSearchDates("2026-05-03", "2026-05-04")).toEqual([]);
  });
});
