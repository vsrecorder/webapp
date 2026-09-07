import { afterEach, describe, expect, it, vi } from "vitest";

import {
  formatDateJa,
  formatJoinDate,
  getCalendarGrid,
  getJstNow,
  toDateKey,
  toJstDateKey,
} from "@app/utils/calendar";

afterEach(() => {
  vi.useRealTimers();
});

describe("toDateKey", () => {
  it("実時刻をJST基準の日付キーに丸める", () => {
    expect(toDateKey("2026-09-07T00:00:00Z")).toBe("2026-09-07");
    expect(toDateKey("2026-09-07T12:00:00Z")).toBe("2026-09-07");
  });

  it("UTCで前日でもJSTで日付が変わっていれば翌日のキーになる", () => {
    // UTC 2026-09-06 15:00 = JST 2026-09-07 00:00
    expect(toDateKey("2026-09-06T15:00:00Z")).toBe("2026-09-07");
    expect(toDateKey("2026-09-06T14:59:59Z")).toBe("2026-09-06");
  });
});

describe("toJstDateKey", () => {
  it("JST基準に丸め済みのDateから日付キーを作る", () => {
    // getJstNow() と同じ形(実時刻 + 9時間)のDateを渡す
    expect(toJstDateKey(new Date("2026-09-07T00:30:00Z"))).toBe("2026-09-07");
    expect(toJstDateKey(new Date("2026-09-07T23:59:59Z"))).toBe("2026-09-07");
  });

  it("getJstNow() の結果はJSTの今日のキーになる(オフセットが二重に乗らない)", () => {
    // JST 2026-09-07 23:00 (= UTC 14:00)。toDateKey に通すと翌日になってしまう時刻
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-07T14:00:00Z"));

    expect(toJstDateKey(getJstNow())).toBe("2026-09-07");
    expect(toDateKey(Date.now())).toBe("2026-09-07");
  });

  it("JSTの日付が変わった直後も当日のキーを返す", () => {
    // JST 2026-09-08 00:00 (= UTC 2026-09-07 15:00)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-07T15:00:00Z"));

    expect(toJstDateKey(getJstNow())).toBe("2026-09-08");
  });
});

describe("getCalendarGrid", () => {
  it("常に6週(42日)ぶんのセルを返す", () => {
    expect(getCalendarGrid(2026, 8)).toHaveLength(42);
    expect(getCalendarGrid(2026, 1)).toHaveLength(42);
  });

  it("日曜始まりで、前後の月の日付で埋める", () => {
    // 2026年9月(month=8)の1日は火曜日
    const grid = getCalendarGrid(2026, 8);

    expect(grid[0].dateKey).toBe("2026-08-30");
    expect(grid[0].inCurrentMonth).toBe(false);
    expect(grid[2].dateKey).toBe("2026-09-01");
    expect(grid[2].inCurrentMonth).toBe(true);
    expect(grid[41].dateKey).toBe("2026-10-10");
    expect(grid[41].inCurrentMonth).toBe(false);
  });

  it("セルのキーは日付とずれない(今日のセルが正しく特定できる)", () => {
    // JST 2026-09-07 23:00。今日のハイライト判定に使う組み合わせを通しで確認する
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-07T14:00:00Z"));

    const today = getJstNow();
    const grid = getCalendarGrid(today.getUTCFullYear(), today.getUTCMonth());
    const todayCells = grid.filter((c) => c.dateKey === toJstDateKey(today));

    expect(todayCells).toHaveLength(1);
    expect(todayCells[0].date.getUTCDate()).toBe(7);
  });
});

describe("formatJoinDate / formatDateJa", () => {
  // 端末のタイムゾーンで読むと、UTCより西の端末で前日(前月)に寄る値で確かめる
  const jstMidnight = "2026-08-01T00:00:00+09:00";

  it("利用開始はJSTの年月で出す", () => {
    expect(formatJoinDate(jstMidnight)).toBe("2026年8月からバトレコを利用");
  });

  it("日付はJSTの暦日を「YYYY年MM月DD日」で出す", () => {
    expect(formatDateJa(jstMidnight)).toBe("2026年08月01日");
    expect(formatDateJa("2026-07-31T23:30:00Z")).toBe("2026年08月01日");
  });
});
