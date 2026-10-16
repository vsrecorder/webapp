import { afterEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

/*
 * 直近の大会の分類待ちの判定を返す API。判定そのもの(cityleagueAwaitingServer)は別でテストしているので、
 * ここでは絞り込みの受け渡しと、判定が無いときの応答だけを見る。
 */
const getRecentDeckArchetypes = vi.fn();
const pickRecentDeckArchetypes = vi.fn();
vi.mock("@app/utils/cityleagueAwaitingServer", () => ({
  getRecentDeckArchetypes: () => getRecentDeckArchetypes(),
  pickRecentDeckArchetypes: (...args: unknown[]) => pickRecentDeckArchetypes(...args),
}));

const { GET } = await import("@app/api/cityleague_results/recent_deck_archetypes/route");

const request = (query: string) =>
  new NextRequest(`http://localhost/api/cityleague_results/recent_deck_archetypes${query}`);

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/cityleague_results/recent_deck_archetypes", () => {
  it("サーバの判定をリーグ・日付で絞って返し、ブラウザに持たせない", async () => {
    const snapshot = { today: "2026-10-17" };
    const body = { today: "2026-10-17", checked: [1], awaiting: [], decks: {} };
    getRecentDeckArchetypes.mockResolvedValue(snapshot);
    pickRecentDeckArchetypes.mockReturnValue(body);

    const res = await GET(request("?league_type=1&date=2026-10-17"));

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual(body);
    expect(pickRecentDeckArchetypes).toHaveBeenCalledWith(snapshot, {
      leagueType: 1,
      date: "2026-10-17",
    });
  });

  it("判定を作れなければ 503(呼び出し側は何も隠さない)", async () => {
    getRecentDeckArchetypes.mockResolvedValue(null);

    expect((await GET(request(""))).status).toBe(503);
  });

  it("形の合わない絞り込みは 400", async () => {
    expect((await GET(request("?league_type=x"))).status).toBe(400);
    expect((await GET(request("?date=2026/10/17"))).status).toBe(400);
    expect(getRecentDeckArchetypes).not.toHaveBeenCalled();
  });
});
