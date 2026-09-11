import { afterEach, describe, expect, it, vi } from "vitest";

import { freezeRegenText } from "@app/utils/streak";

afterEach(() => {
  vi.useRealTimers();
});

// JST 2026-09-09(水) = UTC 2026-09-09 03:00。今週の月曜は 2026-09-07。
function setNowToWednesday() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-09T03:00:00Z"));
}

describe("freezeRegenText", () => {
  it("残り2週以上は残り週数で案内する", () => {
    setNowToWednesday();

    expect(freezeRegenText(2, "2026-09-07T00:00:00Z")).toBe(
      "あと2週連続記録でフリーズが1つ復活",
    );
    expect(freezeRegenText(3, "2026-08-31T00:00:00Z")).toBe(
      "あと3週連続記録でフリーズが1つ復活",
    );
  });

  it("残り1週で最終記録が先週なら、今週記録すれば復活すると案内する", () => {
    setNowToWednesday();

    expect(freezeRegenText(1, "2026-08-31T00:00:00Z")).toBe(
      "今週記録するとフリーズが1つ復活",
    );
  });

  it("残り1週で今週すでに記録していれば、伸びるのは来週になる", () => {
    setNowToWednesday();

    expect(freezeRegenText(1, "2026-09-07T00:00:00Z")).toBe(
      "来週記録するとフリーズが1つ復活",
    );
  });

  it("2週以上あいていると次の記録ではフリーズを消費するので、週を言い切らない", () => {
    setNowToWednesday();

    expect(freezeRegenText(1, "2026-08-24T00:00:00Z")).toBe(
      "あと1週連続記録でフリーズが1つ復活",
    );
  });

  it("最終記録週が未設定やゼロ値でも週を言い切らない", () => {
    setNowToWednesday();

    expect(freezeRegenText(1)).toBe("あと1週連続記録でフリーズが1つ復活");
    expect(freezeRegenText(1, "")).toBe("あと1週連続記録でフリーズが1つ復活");
    expect(freezeRegenText(1, "0001-01-01T00:00:00Z")).toBe(
      "あと1週連続記録でフリーズが1つ復活",
    );
  });

  it("週の境界はJSTで判定する(JSTの月曜になった直後は、その週が今週)", () => {
    // JST 2026-09-07(月) 05:00 = UTC 2026-09-06(日) 20:00。
    // 端末のタイムゾーンで判定すると今週が1週前へずれ、「今週/来週」が入れ替わる時刻。
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T20:00:00Z"));

    expect(freezeRegenText(1, "2026-08-31T00:00:00Z")).toBe(
      "今週記録するとフリーズが1つ復活",
    );
    expect(freezeRegenText(1, "2026-09-07T00:00:00Z")).toBe(
      "来週記録するとフリーズが1つ復活",
    );
  });
});
