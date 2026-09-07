import { describe, expect, it } from "vitest";

import {
  JST_TIME_ZONE,
  ZERO_DATE,
  diffInDays,
  formatJSTDate,
  formatJSTDateNumeric,
  formatJSTDateTimeWithWeekday,
  formatJSTDateWithWeekday,
  formatJSTTime,
  formatJSTYearMonth,
  isZeroDate,
  nonZeroDate,
  toJSTDateString,
} from "@app/utils/date";

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

describe("formatJSTDateWithWeekday / formatJSTYearMonth", () => {
  it("JST の暦日で整形する(バックエンドの開催日は JST 0:00 を UTC で表す)", () => {
    // 2026-08-18 JST 0:00 = 2026-08-17T15:00:00Z。UTC で読むと前日になる
    expect(formatJSTDateWithWeekday("2026-08-17T15:00:00Z")).toBe("2026年8月18日(火)");
    expect(formatJSTDateWithWeekday(new Date("2026-08-18T00:00:00+09:00"))).toBe("2026年8月18日(火)");
    expect(formatJSTYearMonth("2026-08-17T15:00:00Z")).toBe("2026年8月");
    // 月の境目も JST で決める
    expect(formatJSTYearMonth("2026-08-31T15:00:00Z")).toBe("2026年9月");
  });

  it("読めない値は空文字(Invalid Date を出さない)", () => {
    expect(formatJSTDateWithWeekday("not a date")).toBe("");
    expect(formatJSTYearMonth("")).toBe("");
  });
});

/*
 * 表示用の書式はすべて JST 固定。端末のタイムゾーンで読むと、UTCより西の端末で
 * 日付が前日に寄り、サーバ描画(TZ=Asia/Tokyo)との間でハイドレーション不一致にもなる。
 * ここでは「JSTの0時ちょうど」と「UTCの日付が変わる前後」を通して確かめる。
 */
describe("JST固定の表示書式", () => {
  // バックエンドは日付を JST 0:00 として "+09:00" 付きで返す
  const jstMidnight = "2026-08-18T00:00:00+09:00";
  // UTCではまだ 8/17 の時刻(JSTでは 8/18 の朝)
  const jstMorning = "2026-08-17T23:30:00Z";

  it("formatJSTDateWithWeekday は「2026年8月18日(火)」", () => {
    expect(formatJSTDateWithWeekday(jstMidnight)).toBe("2026年8月18日(火)");
    expect(formatJSTDateWithWeekday(jstMorning)).toBe("2026年8月18日(火)");
  });

  it("formatJSTDate は曜日なしの「2026年8月18日」", () => {
    expect(formatJSTDate(jstMidnight)).toBe("2026年8月18日");
    expect(formatJSTDate(jstMorning)).toBe("2026年8月18日");
  });

  it("formatJSTDateNumeric は「2026/8/18」", () => {
    expect(formatJSTDateNumeric(jstMidnight)).toBe("2026/8/18");
    expect(formatJSTDateNumeric(jstMorning)).toBe("2026/8/18");
  });

  it("formatJSTDateTimeWithWeekday は日付と時刻を JST で出す", () => {
    expect(formatJSTDateTimeWithWeekday(jstMidnight)).toBe("2026年8月18日(火) 00:00:00");
  });

  it("formatJSTTime は JST の時刻を「HH:MM」で出す", () => {
    expect(formatJSTTime(jstMidnight)).toBe("00:00");
    expect(formatJSTTime("2026-08-18T09:05:00+09:00")).toBe("09:05");
    expect(formatJSTTime(jstMorning)).toBe("08:30");
  });

  it("formatJSTTime は未設定(ゼロ値)・null・不正値を空文字にする", () => {
    expect(formatJSTTime(ZERO_DATE)).toBe("");
    expect(formatJSTTime(null)).toBe("");
    expect(formatJSTTime(undefined)).toBe("");
    expect(formatJSTTime("これは日付ではない")).toBe("");
  });

  it("読めない値は空文字にする", () => {
    expect(formatJSTDate("これは日付ではない")).toBe("");
    expect(formatJSTDateNumeric("")).toBe("");
    expect(formatJSTDateTimeWithWeekday("これは日付ではない")).toBe("");
  });

  it("JST_TIME_ZONE は IANA のタイムゾーン名", () => {
    expect(JST_TIME_ZONE).toBe("Asia/Tokyo");
  });
});
