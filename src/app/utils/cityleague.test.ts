import { describe, expect, it } from "vitest";

import { findTermByDate, toMonthKey, type CityleagueTerm } from "@app/utils/cityleague";

// バックエンドは日付を JST の 0:00 として "+09:00" 付きの文字列で返す
// (実測: /api/environments → "2026-09-16T00:00:00+09:00")。
// CityleagueTerm の型は Date だが、レスポンスJSONをそのまま流しているので実体は文字列。
// 実データと同じ形で検証したいため、ここでは文字列のままキャストして渡す。
const TERMS = [
  {
    id: "m5",
    title: "アビスアイ",
    from_date: "2026-05-22T00:00:00+09:00",
    to_date: "2026-07-30T00:00:00+09:00",
  },
  {
    id: "m6",
    title: "ストームエメラルダ",
    from_date: "2026-07-31T00:00:00+09:00",
    to_date: "2026-09-15T00:00:00+09:00",
  },
] as unknown as CityleagueTerm[];

describe("findTermByDate", () => {
  it("期間の初日・最終日を期間に含める", () => {
    expect(findTermByDate(TERMS, "2026-07-31T00:00:00+09:00")?.id).toBe("m6");
    expect(findTermByDate(TERMS, "2026-09-15T00:00:00+09:00")?.id).toBe("m6");
    expect(findTermByDate(TERMS, "2026-05-22T00:00:00+09:00")?.id).toBe("m5");
    expect(findTermByDate(TERMS, "2026-07-30T00:00:00+09:00")?.id).toBe("m5");
  });

  it("期間外の日付はどの期間にも属さない", () => {
    expect(findTermByDate(TERMS, "2026-05-21T00:00:00+09:00")).toBeUndefined();
    expect(findTermByDate(TERMS, "2026-09-16T00:00:00+09:00")).toBeUndefined();
  });

  it("JSTの暦日文字列を渡しても同じ期間に解決する", () => {
    // 期間の境界を JST の暦日として比較する。UTC へ寄せて切ると "+09:00" 付きの
    // 日時だけが前日に寄り、暦日文字列と食い違ってしまう。
    expect(findTermByDate(TERMS, "2026-07-31")?.id).toBe("m6");
    expect(findTermByDate(TERMS, "2026-09-15")?.id).toBe("m6");
    expect(findTermByDate(TERMS, "2026-07-30")?.id).toBe("m5");
  });
});

describe("toMonthKey", () => {
  it("JSTでの年月を返す(月初・月末で前月に寄らない)", () => {
    expect(toMonthKey("2026-04-01T00:00:00+09:00")).toBe("2026-04");
    expect(toMonthKey("2026-04-30T00:00:00+09:00")).toBe("2026-04");
  });
});
