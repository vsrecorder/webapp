import { describe, expect, it } from "vitest";

import { decideWinback, emptyWeeksSince, isWinbackDismissed } from "@app/utils/winback";

// last_recorded_week は DATE カラムで、UTC の0時として返る(utils/date の注意書き)
const week = (monday: string) => `${monday}T00:00:00Z`;

describe("emptyWeeksSince", () => {
  it("最後の週と今週のあいだに挟まる週を数える", () => {
    // 10/19週 → 11/30週: 空いたのは 10/26・11/02・11/09・11/16・11/23 の5週
    expect(emptyWeeksSince(week("2026-10-19"), "2026-12-02")).toBe(5);
    // 先週対戦していれば空きは0
    expect(emptyWeeksSince(week("2026-11-23"), "2026-12-02")).toBe(0);
  });

  it("今週の中ならどの曜日でも同じ値になる", () => {
    expect(emptyWeeksSince(week("2026-10-26"), "2026-11-30")).toBe(4); // 月
    expect(emptyWeeksSince(week("2026-10-26"), "2026-12-06")).toBe(4); // 日
  });

  it("今週や未来の週に対戦があれば0", () => {
    expect(emptyWeeksSince(week("2026-11-30"), "2026-12-02")).toBe(0);
    expect(emptyWeeksSince(week("2026-12-07"), "2026-12-02")).toBe(0);
  });

  it("未設定・ゼロ値・不正な日付は判定しない", () => {
    expect(emptyWeeksSince(undefined, "2026-12-02")).toBeNull();
    expect(emptyWeeksSince(null, "2026-12-02")).toBeNull();
    expect(emptyWeeksSince("0001-01-01T00:00:00Z", "2026-12-02")).toBeNull();
    expect(emptyWeeksSince("not a date", "2026-12-02")).toBeNull();
  });
});

describe("decideWinback", () => {
  const base = {
    today: "2026-11-30",
    totalRecords: 3,
    recordingNow: false,
    dismissed: false,
  };

  it("空きが4週で出す(10/26週が最後 → 11/30週)", () => {
    expect(decideWinback({ ...base, lastRecordedWeek: week("2026-10-26") })).toEqual({
      emptyWeeks: 4,
      lastWeek: "2026-10-26",
    });
  });

  it("空きが3週では出さない(フリーズで継続中でありうる)", () => {
    expect(decideWinback({ ...base, lastRecordedWeek: week("2026-11-02") })).toBeNull();
  });

  it("記録0件・取得失敗の人には出さない", () => {
    expect(
      decideWinback({ ...base, lastRecordedWeek: week("2026-10-05"), totalRecords: 0 }),
    ).toBeNull();
    expect(
      decideWinback({ ...base, lastRecordedWeek: week("2026-10-05"), totalRecords: null }),
    ).toBeNull();
  });

  it("記録中のイベントがある人・閉じた直後の人には出さない", () => {
    expect(
      decideWinback({ ...base, lastRecordedWeek: week("2026-10-05"), recordingNow: true }),
    ).toBeNull();
    expect(
      decideWinback({ ...base, lastRecordedWeek: week("2026-10-05"), dismissed: true }),
    ).toBeNull();
  });

  it("ストリークの無い人(last_recorded_week 未設定)には出さない", () => {
    expect(decideWinback({ ...base, lastRecordedWeek: undefined })).toBeNull();
  });
});

describe("isWinbackDismissed", () => {
  it("cookie の値が 1 のときだけ閉じたとみなす", () => {
    expect(isWinbackDismissed("1")).toBe(true);
    expect(isWinbackDismissed("0")).toBe(false);
    expect(isWinbackDismissed(undefined)).toBe(false);
    expect(isWinbackDismissed(null)).toBe(false);
  });
});
