import { afterEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

/*
 * 選手ページの戦績 API。上流の中継と、デッキ分類が揃わない直近の大会を除く詰め替えだけを見る。
 * 除く判定そのもの(withoutAwaitingCityleagueEvents)は別でテストしている。
 */
const auth = vi.fn();
vi.mock("@app/auth", () => ({ auth: () => auth() }));
vi.mock("@app/utils/upstreamToken", () => ({ signUpstreamToken: () => "token" }));

const fetchUpstream = vi.fn();
vi.mock("@app/utils/upstream", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@app/utils/upstream")>()),
  fetchUpstream: (...args: unknown[]) => fetchUpstream(...args),
}));

// 大会 2 だけを分類待ちとして除く
vi.mock("@app/utils/cityleagueAwaitingServer", () => ({
  withoutAwaitingCityleagueEvents: async <T,>(items: T[], eventOf: (item: T) => { id: number }) =>
    items.filter((item) => eventOf(item).id !== 2),
}));

const { GET } = await import("@app/api/usersplayers/cityleague_results/route");

const result = (id: number) => ({ official_event_id: id, date: "2026-10-17T00:00:00+09:00", rank: 1 });

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/usersplayers/cityleague_results", () => {
  it("デッキ分類がまだ揃わない直近の大会を除き、件数も合わせる", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    fetchUpstream.mockResolvedValue({ season: "2027", count: 2, results: [result(1), result(2)] });

    const res = await GET(new NextRequest("http://localhost/api/usersplayers/cityleague_results?season=2027"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ season: "2027", count: 1, results: [result(1)] });
  });

  it("除くものが無ければ上流の応答をそのまま返す", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    const body = { season: "2027", count: 1, results: [result(1)] };
    fetchUpstream.mockResolvedValue(body);

    const res = await GET(new NextRequest("http://localhost/api/usersplayers/cityleague_results"));

    expect(await res.json()).toEqual(body);
  });
});
