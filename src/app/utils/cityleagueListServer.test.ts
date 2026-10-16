import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCityleagueListInitialData } from "@app/utils/cityleagueListServer";
import { LIST_REVALIDATE_SECONDS } from "@app/utils/coreApi";

// 一覧の組み立てに要る周辺の取得は、ここでは中身を問わない
vi.mock("@app/utils/officialEventListServer", () => ({
  getOfficialEventList: vi.fn().mockResolvedValue({ official_events: [] }),
}));
vi.mock("@app/utils/deckArchetypeServer", () => ({
  getDeckArchetypesByCodes: vi.fn().mockResolvedValue({}),
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
});
