import { afterEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

const getDeckArchetypesByCodes = vi.fn();
vi.mock("@app/utils/deckArchetypeServer", () => ({
  getDeckArchetypesByCodes: (...args: unknown[]) => getDeckArchetypesByCodes(...args),
}));

const { GET } = await import("@app/api/cityleague_results/deck_archetypes/route");

function request(codes: string | null): NextRequest {
  const url = new URL("http://localhost/api/cityleague_results/deck_archetypes");
  if (codes !== null) url.searchParams.set("codes", codes);
  return new NextRequest(url);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/cityleague_results/deck_archetypes", () => {
  it("形の正しいコードだけを重複なく渡し、辞書を返す", async () => {
    getDeckArchetypesByCodes.mockResolvedValue({ "a-1": { deckCode: "a-1", label: "x" } });

    const res = await GET(request("b-2,a-1,,a-1,bad code"));

    expect(res.status).toBe(200);
    expect(getDeckArchetypesByCodes).toHaveBeenCalledWith(["a-1", "b-2"]);
    expect(await res.json()).toEqual({ decks: { "a-1": { deckCode: "a-1", label: "x" } } });
  });

  it("コードが無ければ 400", async () => {
    expect((await GET(request(null))).status).toBe(400);
    expect((await GET(request(",,"))).status).toBe(400);
    expect(getDeckArchetypesByCodes).not.toHaveBeenCalled();
  });

  it("上限(100 件)を超えたら 400", async () => {
    const codes = Array.from({ length: 101 }, (_, i) => `c-${i}`).join(",");

    expect((await GET(request(codes))).status).toBe(400);
    expect(getDeckArchetypesByCodes).not.toHaveBeenCalled();
  });
});
