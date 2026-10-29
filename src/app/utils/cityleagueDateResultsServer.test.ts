import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OfficialEventType } from "@app/types/official_event";
import { resetRecentDeckArchetypesForTest } from "@app/utils/cityleagueAwaitingServer";
import { getCityleagueDateResults } from "@app/utils/cityleagueDateResultsServer";
import { getDeckArchetypesByCodes } from "@app/utils/deckArchetypeServer";

vi.mock("@app/utils/deckArchetypeServer", () => ({
  getDeckArchetypesByCodes: vi.fn().mockResolvedValue({}),
  lookupDeckArchetypesByCodes: vi.fn().mockResolvedValue({ decks: {}, pending: [] }),
}));

// 待つ期間(今日・昨日)より前の日。上流から取る経路を試す
const DATE = "2026-10-04";

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

function eventResult(officialEventId: number, leagueType: number, deckCode: string) {
  return {
    cityleague_schedule_id: "2027s1",
    official_event_id: officialEventId,
    league_type: leagueType,
    date: `${DATE}T00:00:00+09:00`,
    results: [{ player_id: "p", player_name: "n", rank: 1, point: 0, deck_code: deckCode }],
  };
}

function visible(...ids: number[]): OfficialEventType[] {
  return ids.map((id) => ({ id }) as OfficialEventType);
}

describe("getCityleagueDateResults", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T12:00:00+09:00"));
    resetRecentDeckArchetypesForTest();
    vi.mocked(getDeckArchetypesByCodes).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("ふだんはキャッシュから取り、表示してよい大会だけに絞る", async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () =>
      jsonResponse({ event_results: [eventResult(1, 1, "A"), eventResult(9, 1, "Z")] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const data = await getCityleagueDateResults(DATE, visible(1));

    expect(data?.results.map((result) => result.official_event_id)).toEqual([1]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.cache).toBe("force-cache");
  });

  /*
   * 表示してよい大会の一覧と結果は、別々に5分キャッシュされる。期限の切れ目がずれると、
   * 一覧に載っているのに結果のキャッシュに無い大会が出て、その会場のカードがどこにも出ない。
   */
  it("キャッシュの結果に欠けている大会があれば、キャッシュを通さずに取り直す", async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async (_url, init) =>
        jsonResponse({
          event_results:
            init?.cache === "no-store"
              ? [eventResult(1, 1, "A"), eventResult(2, 1, "B")]
              : [eventResult(1, 1, "A")],
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const data = await getCityleagueDateResults(DATE, visible(1, 2));

    expect(data?.results.map((result) => result.official_event_id)).toEqual([1, 2]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]?.cache).toBe("no-store");
  });

  // 一覧(リーグ×日)と同じ単位で引くと、バトラボへの照会の URL が一覧と同じになりキャッシュを共有できる
  it("入賞デッキの種類はリーグごとに分けて引き、まとめて返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          event_results: [eventResult(1, 1, "A"), eventResult(2, 3, "B"), eventResult(3, 1, "C")],
        }),
      ),
    );
    vi.mocked(getDeckArchetypesByCodes).mockImplementation(async (codes) =>
      Object.fromEntries(codes.map((code) => [code, { deckCode: code } as never])),
    );

    const data = await getCityleagueDateResults(DATE, visible(1, 2, 3));

    expect(vi.mocked(getDeckArchetypesByCodes).mock.calls.map(([codes]) => codes)).toEqual([
      ["A", "C"],
      ["B"],
    ]);
    expect(Object.keys(data?.deckArchetypes ?? {}).sort()).toEqual(["A", "B", "C"]);
  });

  it("種類が取れなくても結果は返す", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ event_results: [eventResult(1, 1, "A")] })));
    vi.mocked(getDeckArchetypesByCodes).mockRejectedValue(new Error("vslab down"));

    const data = await getCityleagueDateResults(DATE, visible(1));

    expect(data?.results).toHaveLength(1);
    expect(data?.deckArchetypes).toEqual({});
  });

  it("結果が取れなければ null(ページは店舗名のリンクの一覧に戻す)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 502, json: async () => ({}) }) as unknown as Response),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await getCityleagueDateResults(DATE, visible(1))).toBeNull();
  });
});
