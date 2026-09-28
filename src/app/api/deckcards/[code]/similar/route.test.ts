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

// 投稿日から環境を決めるときの環境一覧(core-apiserver)
const getJson = vi.fn();
vi.mock("@app/utils/coreApi", () => ({ getJson: (...args: unknown[]) => getJson(...args) }));

const ENVIRONMENTS = [
  { id: "m5", title: "前の環境", from_date: "2026-07-18T00:00:00+09:00", to_date: "2026-09-15T00:00:00+09:00" },
  { id: "m6a", title: "30th CELEBRATION", from_date: "2026-09-16T00:00:00+09:00", to_date: "2026-11-26T00:00:00+09:00" },
  { id: "m6b", title: "次の環境", from_date: "2026-11-27T00:00:00+09:00", to_date: "2027-01-22T00:00:00+09:00" },
];

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

  it("date を渡すと、その日の環境を決めて env として渡す(env が無いとき)", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    getJson.mockResolvedValue(ENVIRONMENTS);
    getSimilarDecks.mockResolvedValue({ status: "ok", data });

    expect((await call("FkVdfF-xyOrPQ-FvbvdF", "?date=2026-11-26")).status).toBe(200);
    expect(getSimilarDecks).toHaveBeenLastCalledWith("FkVdfF-xyOrPQ-FvbvdF", "m6a");

    // 新しい環境の初日からはその環境
    await call("FkVdfF-xyOrPQ-FvbvdF", "?date=2026-11-27");
    expect(getSimilarDecks).toHaveBeenLastCalledWith("FkVdfF-xyOrPQ-FvbvdF", "m6b");
  });

  it("date の環境がバトラボに無ければ、環境名を添えて 422 にする", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    getJson.mockResolvedValue(ENVIRONMENTS);
    getSimilarDecks.mockResolvedValue({ status: "unknown_env" });

    const res = await call("FkVdfF-xyOrPQ-FvbvdF", "?date=2026-12-01");

    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain("『次の環境』");
  });

  it("環境一覧が取れなければ、直近の環境で比べずに 502 にする", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    getJson.mockResolvedValue(null);

    const res = await call("FkVdfF-xyOrPQ-FvbvdF", "?date=2026-09-20");

    expect(res.status).toBe(502);
    expect(getSimilarDecks).not.toHaveBeenCalled();
  });

  it("書式外の date は 400、『30th CELEBRATION』より前の日付は 422 で、バトラボへは引かない", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    getJson.mockResolvedValue(ENVIRONMENTS);

    expect((await call("FkVdfF-xyOrPQ-FvbvdF", "?date=2026/09/10")).status).toBe(400);

    const res = await call("FkVdfF-xyOrPQ-FvbvdF", "?date=2026-09-15");
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain("『30th CELEBRATION』より前");
    expect(getSimilarDecks).not.toHaveBeenCalled();
  });
});
