import { describe, expect, it } from "vitest";

import {
  OWN_DECK_HISTORY_WINDOW_MONTHS,
  filterOwnDeckHistoryWindow,
  ownDeckHistoryCutoff,
} from "@app/utils/deckHistoryWindow";

const now = new Date("2026-09-17T12:00:00+09:00");

// created_at だけを持つ最小のマッチ(候補の期間判定はこの項目しか見ない)
const match = (createdAt: string) => ({ created_at: new Date(createdAt) });

describe("ownDeckHistoryCutoff", () => {
  it("指定した時刻から所定の月数だけ遡った時刻を返す", () => {
    const cutoff = ownDeckHistoryCutoff(now);

    expect(OWN_DECK_HISTORY_WINDOW_MONTHS).toBe(6);
    expect(cutoff.toISOString()).toBe(new Date("2026-03-17T12:00:00+09:00").toISOString());
  });
});

describe("filterOwnDeckHistoryWindow", () => {
  it("期間内の対戦だけを残す", () => {
    const matches = [
      match("2026-09-16T12:00:00+09:00"), // 昨日
      match("2026-06-01T12:00:00+09:00"), // 3か月前
      match("2026-03-17T12:00:00+09:00"), // ちょうど6か月前(境界は含む)
      match("2026-03-16T12:00:00+09:00"), // 6か月と1日前
      match("2024-01-01T12:00:00+09:00"), // 2年以上前
    ];

    const ret = filterOwnDeckHistoryWindow(matches, now);

    expect(ret).toHaveLength(3);
    expect(ret.map((m) => m.created_at.toISOString())).toEqual([
      new Date("2026-09-16T12:00:00+09:00").toISOString(),
      new Date("2026-06-01T12:00:00+09:00").toISOString(),
      new Date("2026-03-17T12:00:00+09:00").toISOString(),
    ]);
  });

  it("未取得(undefined)は空配列を返す", () => {
    expect(filterOwnDeckHistoryWindow(undefined, now)).toEqual([]);
  });

  it("空配列はそのまま空配列", () => {
    expect(filterOwnDeckHistoryWindow([], now)).toEqual([]);
  });

  // 期間を判定できない対戦を素通しすると、古いデッキが候補に混ざる
  it("created_atが日付として解釈できない対戦は除く", () => {
    const matches = [
      { created_at: new Date("こわれた日時") },
      match("2026-09-16T12:00:00+09:00"),
    ];

    const ret = filterOwnDeckHistoryWindow(matches, now);

    expect(ret).toHaveLength(1);
    expect(ret[0].created_at.toISOString()).toBe(
      new Date("2026-09-16T12:00:00+09:00").toISOString(),
    );
  });

  // JSONから復元した直後は created_at が文字列のことがある(SWRの応答をそのまま渡す経路)
  it("created_atが文字列でも判定できる", () => {
    const matches = [
      { created_at: "2026-09-16T12:00:00+09:00" as unknown as Date },
      { created_at: "2024-01-01T12:00:00+09:00" as unknown as Date },
    ];

    const ret = filterOwnDeckHistoryWindow(matches, now);

    expect(ret).toHaveLength(1);
  });
});
