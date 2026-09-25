import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WeeklyDeckUsageTrendType } from "@app/types/weekly_deck_usage_trend";

const TREND: WeeklyDeckUsageTrendType = { limit: 30, weeks: [], series: [] };

// 控えはモジュールの中に持つため、テストごとに読み込み直して空の状態から始める
async function loadModule() {
  vi.resetModules();
  return await import("@app/components/organisms/DeckMeta/weeklyDeckUsageTrendLoader");
}

const range = { from: "2026-08-10", to: "2026-09-14" };

describe("weeklyDeckUsageTrendLoader", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-26T12:00:00+09:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("同じ期間は1回だけ取得し、届いた結果は同期的に覗ける", async () => {
    const fetchMock = vi.fn(async () => Response.json(TREND));
    vi.stubGlobal("fetch", fetchMock);
    const m = await loadModule();

    expect(m.peekWeeklyDeckUsageTrend(range)).toBeUndefined();
    // 先読み中にパネルが同じ期間を取りに来ても、通信は1回で済む
    m.prefetchWeeklyDeckUsageTrend(range);
    await expect(m.loadWeeklyDeckUsageTrend(range)).resolves.toEqual(TREND);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]).toEqual([
      "/api/deck_meta/weekly_usage_trend?from=2026-08-10&to=2026-09-14",
      { cache: "no-store" },
    ]);
    expect(m.peekWeeklyDeckUsageTrend(range)).toEqual(TREND);
  });

  it("fresh を立てると控えを使わずに取り直す", async () => {
    const fetchMock = vi.fn(async () => Response.json(TREND));
    vi.stubGlobal("fetch", fetchMock);
    const m = await loadModule();

    await m.loadWeeklyDeckUsageTrend(range);
    await m.loadWeeklyDeckUsageTrend(range, { fresh: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("5分を過ぎた控えは使わない", async () => {
    const fetchMock = vi.fn(async () => Response.json(TREND));
    vi.stubGlobal("fetch", fetchMock);
    const m = await loadModule();

    await m.loadWeeklyDeckUsageTrend(range);
    vi.setSystemTime(new Date("2026-09-26T12:05:01+09:00"));
    expect(m.peekWeeklyDeckUsageTrend(range)).toBeUndefined();
    await m.loadWeeklyDeckUsageTrend(range);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("失敗した取得は控えに残さず、次の呼び出しで取り直す", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 502 }))
      .mockResolvedValueOnce(Response.json(TREND));
    vi.stubGlobal("fetch", fetchMock);
    const m = await loadModule();

    await expect(m.loadWeeklyDeckUsageTrend(range)).rejects.toThrow("502");
    // 失敗の後始末(控えから外す)は then の後に走るので、1回ぶん待つ
    await Promise.resolve();
    await expect(m.loadWeeklyDeckUsageTrend(range)).resolves.toEqual(TREND);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("URL の期間が無い・不正なら先週までの6週から始める", async () => {
    const m = await loadModule();
    expect(m.initialTrendRange(new URLSearchParams())).toEqual({
      from: "2026-08-10",
      to: "2026-09-14",
    });
    expect(
      m.initialTrendRange(new URLSearchParams("from=2026-07-06&to=2026-09-07")),
    ).toEqual({ from: "2026-07-06", to: "2026-09-07" });
  });
});
