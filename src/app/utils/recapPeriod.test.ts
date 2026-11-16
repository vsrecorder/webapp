import { describe, expect, it } from "vitest";

import { EnvironmentType } from "@app/types/environment";
import { isPeriodEnded, periodDateRange } from "@app/utils/recapPeriod";

// バックエンドは環境の期間を JST 0:00 として "+09:00" 付きで返す
// (実測: /api/environments → "2026-09-16T00:00:00+09:00")。
const environment = {
  id: "m6",
  title: "ストームエメラルダ",
  from_date: "2026-07-31T00:00:00+09:00",
  to_date: "2026-09-15T00:00:00+09:00",
} as unknown as EnvironmentType;

describe("periodDateRange", () => {
  it("週は月曜〜日曜のJST暦日を返す", () => {
    expect(periodDateRange({ kind: "week", week: "2026-08-31" })).toEqual({
      from: "2026-08-31",
      to: "2026-09-06",
    });
  });

  it("月は月初〜月末のJST暦日を返す", () => {
    expect(periodDateRange({ kind: "month", yearMonth: "2026-09" })).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
    // 2月・うるう年の月末も繰り上がらない
    expect(periodDateRange({ kind: "month", yearMonth: "2026-02" })).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(periodDateRange({ kind: "month", yearMonth: "2028-02" })).toEqual({
      from: "2028-02-01",
      to: "2028-02-29",
    });
  });

  it("環境は from_date/to_date をJSTの暦日として返す(UTCへ寄って前日にならない)", () => {
    expect(periodDateRange({ kind: "environment", environment })).toEqual({
      from: "2026-07-31",
      to: "2026-09-15",
    });
  });
});

describe("isPeriodEnded", () => {
  it("環境は最終日の翌日から「終わった」になる", () => {
    const period = { kind: "environment", environment } as const;
    expect(isPeriodEnded(period, "2026-09-15")).toBe(false);
    expect(isPeriodEnded(period, "2026-09-16")).toBe(true);
  });

  it("週と月も最終日の翌日から", () => {
    expect(isPeriodEnded({ kind: "week", week: "2026-08-31" }, "2026-09-06")).toBe(false);
    expect(isPeriodEnded({ kind: "week", week: "2026-08-31" }, "2026-09-07")).toBe(true);
    expect(isPeriodEnded({ kind: "month", yearMonth: "2026-09" }, "2026-09-30")).toBe(false);
    expect(isPeriodEnded({ kind: "month", yearMonth: "2026-09" }, "2026-10-01")).toBe(true);
  });
});
