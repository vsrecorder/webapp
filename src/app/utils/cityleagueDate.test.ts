import { describe, expect, it } from "vitest";

import {
  dateParamToMonthKey,
  formatDateParam,
  parseDateParam,
  toDateParam,
} from "@app/utils/cityleagueDate";

describe("toDateParam", () => {
  // 上流は JST 0:00 を UTC に直した値(前日の 15:00Z)で返すことがある。JST の暦日で読む
  it("JST の暦日にする", () => {
    expect(toDateParam("2026-09-26T00:00:00+09:00")).toBe("2026-09-26");
    expect(toDateParam("2026-09-25T15:00:00Z")).toBe("2026-09-26");
  });
});

describe("parseDateParam", () => {
  it("実在する暦日はそのまま返す", () => {
    expect(parseDateParam("2026-09-26")).toBe("2026-09-26");
    expect(parseDateParam("2028-02-29")).toBe("2028-02-29");
  });

  it("形式違い・存在しない日は null", () => {
    expect(parseDateParam("2026-9-26")).toBeNull();
    expect(parseDateParam("20260926")).toBeNull();
    expect(parseDateParam("2026-02-30")).toBeNull();
    expect(parseDateParam("2026-13-01")).toBeNull();
    expect(parseDateParam("2027-02-29")).toBeNull();
    expect(parseDateParam("../etc")).toBeNull();
  });
});

describe("formatDateParam", () => {
  it("曜日つきの日本語の日付にする", () => {
    expect(formatDateParam("2026-09-26")).toBe("2026年9月26日(土)");
  });
});

describe("dateParamToMonthKey", () => {
  it("開催月のキーにする", () => {
    expect(dateParamToMonthKey("2026-09-26")).toBe("2026-09");
  });
});
