import { describe, expect, it } from "vitest";

import { ZERO_DATE, diffInDays, isZeroDate, nonZeroDate, toJSTDateString } from "@app/utils/date";

describe("isZeroDate", () => {
  it("バックエンドのゼロ値(0001-01-01)は未設定として扱う", () => {
    expect(isZeroDate("0001-01-01T00:00:00Z")).toBe(true);
    expect(isZeroDate(ZERO_DATE)).toBe(true);
    expect(isZeroDate(new Date("0001-01-01T00:00:00Z"))).toBe(true);
  });

  it("null・undefined・空文字も未設定として扱う", () => {
    expect(isZeroDate(null)).toBe(true);
    expect(isZeroDate(undefined)).toBe(true);
    expect(isZeroDate("")).toBe(true);
  });

  it("設定済みの日時は未設定ではない", () => {
    expect(isZeroDate("2026-09-04T12:00:00+09:00")).toBe(false);
    expect(isZeroDate(new Date("2026-09-04T03:00:00Z"))).toBe(false);
  });

  it("不正な Date は未設定として扱う(toISOString で落ちない)", () => {
    expect(isZeroDate(new Date("not a date"))).toBe(true);
  });
});

describe("nonZeroDate", () => {
  it("未設定なら null、設定済みならそのまま返すので ?? で優先順位を組める", () => {
    expect(nonZeroDate("0001-01-01T00:00:00Z")).toBeNull();
    expect(nonZeroDate("2026-09-04T12:00:00+09:00")).toBe("2026-09-04T12:00:00+09:00");
    expect(nonZeroDate("0001-01-01T00:00:00Z") ?? "fallback").toBe("fallback");
  });
});

describe("toJSTDateString / diffInDays", () => {
  it("UTC の日時を JST の暦日に直す", () => {
    // UTC 15:00 = JST 翌日 0:00
    expect(toJSTDateString("2026-09-04T15:00:00Z")).toBe("2026-09-05");
    expect(toJSTDateString("2026-09-04T14:59:59Z")).toBe("2026-09-04");
  });

  it("暦日どうしの差を日数で返す", () => {
    expect(diffInDays("2026-09-01", "2026-09-05")).toBe(4);
    expect(diffInDays("2026-09-05", "2026-09-01")).toBe(-4);
  });
});
