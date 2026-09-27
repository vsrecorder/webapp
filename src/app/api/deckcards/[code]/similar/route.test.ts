import { afterEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

/*
 * デッキ詳細の「類似デッキ」シートが使う BFF の応答の形と状態コード。
 * バトラボへの取得(getSimilarDecks)は別でテストしているので、ここでは認証・検証・詰め替えだけを見る。
 */
const auth = vi.fn();
vi.mock("@app/auth", () => ({ auth: () => auth() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

const getSimilarDecks = vi.fn();
vi.mock("@app/utils/similarDecksServer", () => ({
  getSimilarDecks: (...args: unknown[]) => getSimilarDecks(...args),
}));

const { GET } = await import("@app/api/deckcards/[code]/similar/route");

const data = {
  source: {
    deckCode: "FkVdfF-xyOrPQ-FvbvdF",
    origin: "external",
    environmentId: "m6a",
    environmentTitle: "30th CELEBRATION",
    archetype: { archetypeId: "dragapult", label: "ドラパルトex", sprites: ["0887"] },
    archetypeSkipped: false,
    placements: 0,
    unresolved: [],
  },
  similar: [],
  candidates: 0,
};

function call(code: string, query = "") {
  const request = new NextRequest(
    `http://localhost/api/deckcards/${encodeURIComponent(code)}/similar${query}`,
  );

  return GET(request, { params: Promise.resolve({ code }) });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/deckcards/{code}/similar", () => {
  it("未ログインは 401 で、バトラボへは引かない", async () => {
    auth.mockResolvedValue(null);

    const res = await call("FkVdfF-xyOrPQ-FvbvdF");

    expect(res.status).toBe(401);
    expect(getSimilarDecks).not.toHaveBeenCalled();
  });

  it("書式外のデッキコードは 400 で、バトラボへは引かない", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });

    const res = await call("zz zz");

    expect(res.status).toBe(400);
    expect(getSimilarDecks).not.toHaveBeenCalled();
  });

  it("取れたら 200 で、環境 ID はそのまま渡す", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    getSimilarDecks.mockResolvedValue({ status: "ok", data });

    const res = await call("FkVdfF-xyOrPQ-FvbvdF", "?env=m6a");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(data);
    expect(getSimilarDecks).toHaveBeenCalledWith("FkVdfF-xyOrPQ-FvbvdF", "m6a");
  });

  it("取れなかった理由を状態コードで分ける", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });

    getSimilarDecks.mockResolvedValueOnce({ status: "not_found" });
    expect((await call("a")).status).toBe(404);

    getSimilarDecks.mockResolvedValueOnce({ status: "invalid" });
    expect((await call("a")).status).toBe(400);

    getSimilarDecks.mockResolvedValueOnce({ status: "unreadable" });
    expect((await call("a")).status).toBe(422);

    getSimilarDecks.mockResolvedValueOnce({ status: "unavailable" });
    const res = await call("a");
    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain("やり直してください");
  });
});
