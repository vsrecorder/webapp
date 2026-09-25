import { describe, expect, it } from "vitest";

import { formatEventTimeRange } from "@app/utils/cityleagueEventInfo";

describe("formatEventTimeRange", () => {
  it("開始と終了があれば範囲で出す", () => {
    expect(formatEventTimeRange("09:00", "18:00")).toBe("09:00 〜 18:00");
  });

  // 上流は終了時刻が未設定だと開催日の 0:00 を返す
  it("開始より前の終了時刻は未設定とみなし、開始だけ出す", () => {
    expect(formatEventTimeRange("09:00", "00:00")).toBe("09:00 〜");
    expect(formatEventTimeRange("09:00", "09:00")).toBe("09:00 〜");
    expect(formatEventTimeRange("09:00", "")).toBe("09:00 〜");
  });

  it("開始が無ければ何も出さない", () => {
    expect(formatEventTimeRange("", "18:00")).toBe("");
  });
});
