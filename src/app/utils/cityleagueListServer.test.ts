import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetRecentDeckArchetypesForTest } from "@app/utils/cityleagueAwaitingServer";
import { getCityleagueListInitialData } from "@app/utils/cityleagueListServer";
import { LIST_REVALIDATE_SECONDS } from "@app/utils/coreApi";
import { lookupDeckArchetypesByCodes } from "@app/utils/deckArchetypeServer";

// 一覧の組み立てに要る周辺の取得は、ここでは中身を問わない
vi.mock("@app/utils/officialEventListServer", () => ({
  getOfficialEventList: vi.fn().mockResolvedValue({ official_events: [] }),
}));
vi.mock("@app/utils/deckArchetypeServer", () => ({
  getDeckArchetypesByCodes: vi.fn().mockResolvedValue({}),
  lookupDeckArchetypesByCodes: vi.fn().mockResolvedValue({ decks: {}, pending: [] }),
}));

const SCHEDULE = {
  id: "s1",
  title: "2027シーズン",
  from_date: "2026-09-26T00:00:00+09:00",
  to_date: "2026-11-15T00:00:00+09:00",
};

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

describe("getCityleagueListInitialData", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-16T12:00:00+09:00"));
    resetRecentDeckArchetypesForTest();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /*
   * 一覧はマウント直後に先頭の日を BFF(no-store)で取り直す。サーバ描画がキャッシュの古い
   * 結果だと、直近の結果が一瞬出てから最新が差し込まれて見える(2026-10-16 に報告)。
   */
  it("結果はキャッシュせず毎回取り、スケジュールは一覧の間隔でキャッシュする", async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async (url) => {
        if (url.includes("/cityleague_schedules")) return jsonResponse(SCHEDULE);

        return jsonResponse({
          count: 1,
          event_results: [
            { official_event_id: 1, date: "2026-10-16T00:00:00+09:00", results: [] },
          ],
        });
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const data = await getCityleagueListInitialData(1);

    expect(data?.results).toHaveLength(1);

    const resultCalls = fetchMock.mock.calls.filter(([url]) =>
      url.includes("/api/v1beta/cityleague_results"),
    );
    expect(resultCalls.length).toBeGreaterThan(0);
    for (const [, init] of resultCalls) {
      expect(init).toMatchObject({ cache: "no-store" });
      // no-store と revalidate を併用すると両方無視される
      expect(init).not.toHaveProperty("next");
    }

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1beta/cityleague_schedules?date=2026-10-16"),
      expect.objectContaining({
        cache: "force-cache",
        next: { revalidate: LIST_REVALIDATE_SECONDS },
      }),
    );
  });

  /*
   * 大会結果はバトラボの索引より数分早く入る。分類が揃わない大会は出さず、
   * その日の大会が全部そうなら前の日を1ページ目にする。
   */
  it("デッキ分類がまだ揃わない大会を除き、全部そうなら前の日から出す(判定はハブと同じ 1 枚)", async () => {
    const winner = (deckCode: string) => [{ rank: 1, deck_code: deckCode }];
    const byDate: Record<string, unknown[]> = {
      "2026-10-16": [
        { official_event_id: 1, league_type: 2, date: "2026-10-16T00:00:00+09:00", cityleague_schedule_id: "2027s1", results: winner("P-1") },
      ],
      "2026-10-15": [
        { official_event_id: 2, league_type: 2, date: "2026-10-15T00:00:00+09:00", cityleague_schedule_id: "2027s1", results: winner("P-2") },
        { official_event_id: 3, league_type: 2, date: "2026-10-15T00:00:00+09:00", cityleague_schedule_id: "2027s1", results: winner("R-1") },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/cityleague_schedules")) return jsonResponse(SCHEDULE);

        // 一覧は 1 日ずつ、分類待ちの判定は今日・昨日をまとめて取る
        const params = new URL(url, "http://localhost").searchParams;
        const from = params.get("from_date")!;
        const to = params.get("to_date")!;
        const hits = Object.entries(byDate)
          .filter(([date]) => from <= date && date <= to)
          .flatMap(([, results]) => results);
        return jsonResponse({ count: hits.length, event_results: hits });
      }),
    );
    vi.mocked(lookupDeckArchetypesByCodes).mockImplementation(async (codes) => ({
      decks: Object.fromEntries(
        codes
          .filter((code) => !code.startsWith("P-"))
          .map((code) => [
            code,
            { deckCode: code, archetypeName: "x", variantName: null, label: "x", sprites: [] },
          ]),
      ),
      pending: codes.filter((code) => code.startsWith("P-")),
    }));

    const data = await getCityleagueListInitialData(2);

    expect(data?.results.map((result) => result.official_event_id)).toEqual([3]);
    expect(data?.nextFromDate).toBe("2026-10-14");
    // 出した大会の種類は判定と同じ答えから取る(別に照会すると古いキャッシュで欠けることがある)
    expect(Object.keys(data?.deckArchetypes ?? {})).toEqual(["R-1"]);
  });
});
