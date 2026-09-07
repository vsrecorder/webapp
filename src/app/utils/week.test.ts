import { afterEach, describe, expect, it, vi } from "vitest";

import {
  currentWeekValue,
  generateWeekOptions,
  isInCurrentWeekJST,
  lastWeekValue,
  mondayOfJSTDateString,
  weekValueOfJSTDate,
} from "@app/utils/week";

afterEach(() => {
  vi.useRealTimers();
});

describe("mondayOfJSTDateString", () => {
  it("月曜はその日、日曜は6日前の月曜を返す", () => {
    expect(mondayOfJSTDateString("2026-09-07")).toBe("2026-09-07"); // 月
    expect(mondayOfJSTDateString("2026-09-13")).toBe("2026-09-07"); // 日
    expect(mondayOfJSTDateString("2026-09-06")).toBe("2026-08-31"); // 日(前週)
  });
});

describe("currentWeekValue / lastWeekValue", () => {
  it("JSTの月曜になった直後は、その日が今週の起点になる", () => {
    // JST 2026-09-07(月) 05:00 = UTC 2026-09-06(日) 20:00。
    // 端末のタイムゾーンで判定すると前の週(2026-08-31)に寄ってしまう時刻。
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T20:00:00Z"));

    expect(currentWeekValue()).toBe("2026-09-07");
    expect(lastWeekValue()).toBe("2026-08-31");
  });

  it("JSTの月曜になる直前は、まだ前の週が今週", () => {
    // JST 2026-09-06(日) 23:59 = UTC 2026-09-06 14:59
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T14:59:00Z"));

    expect(currentWeekValue()).toBe("2026-08-31");
    expect(lastWeekValue()).toBe("2026-08-24");
  });

  it("年をまたぐ週も正しく遡る", () => {
    // JST 2027-01-01(金)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-31T15:00:00Z"));

    expect(currentWeekValue()).toBe("2026-12-28");
    expect(lastWeekValue()).toBe("2026-12-21");
  });
});

describe("generateWeekOptions", () => {
  it("今週から新しい順に、月曜始まりの週を返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T20:00:00Z")); // JST 2026-09-07(月)

    const options = generateWeekOptions(3);

    expect(options).toEqual([
      { value: "2026-09-07", label: "9/7〜9/13 の週" },
      { value: "2026-08-31", label: "8/31〜9/6 の週" },
      { value: "2026-08-24", label: "8/24〜8/30 の週" },
    ]);
  });

  it("月をまたぐ週のラベルも両端の月を出す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T00:00:00Z")); // JST 2026-06-29(月)

    expect(generateWeekOptions(1)).toEqual([
      { value: "2026-06-29", label: "6/29〜7/5 の週" },
    ]);
  });
});

describe("isInCurrentWeekJST / weekValueOfJSTDate", () => {
  it("バックエンドの日付(+09:00)をJSTの暦日として週に割り当てる", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T20:00:00Z")); // JST 2026-09-07(月)

    expect(weekValueOfJSTDate("2026-09-07T00:00:00+09:00")).toBe("2026-09-07");
    expect(isInCurrentWeekJST("2026-09-07T00:00:00+09:00")).toBe(true);
    expect(isInCurrentWeekJST("2026-09-06T00:00:00+09:00")).toBe(false);
  });

  it("lastWeekValue と週の判定が食い違わない", () => {
    // 端末TZ基準の実装では、この時刻に isInCurrentWeekJST=true なのに
    // lastWeekValue() が先々週(2026-08-24)を返し、両者が食い違っていた。
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T20:00:00Z"));

    const eventDate = "2026-09-07T00:00:00+09:00";
    expect(isInCurrentWeekJST(eventDate)).toBe(true);
    expect(lastWeekValue()).toBe(mondayOfJSTDateString("2026-08-31"));
  });
});
