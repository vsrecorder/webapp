import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSimilarDecks } from "@app/utils/similarDecksServer";

const okBody = {
  source: {
    deckCode: "FkVdfF-xyOrPQ-FvbvdF",
    origin: "external",
    environmentId: "m6a",
    environmentTitle: "30th CELEBRATION",
    deckType: { archetypeId: "dragapult", label: "ドラパルトex", spriteUrls: [] },
    deckTypeSkipped: false,
    unresolved: [],
  },
  similar: [],
  candidates: 0,
};

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  delete process.env.VSLAB_ORIGIN;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

describe("getSimilarDecks", () => {
  it("vslab の類似デッキ検索を引き、表示用の形で返す", async () => {
    fetchMock.mockResolvedValue(Response.json(okBody));

    const result = await getSimilarDecks("FkVdfF-xyOrPQ-FvbvdF");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://lab.vsrecorder.mobi/api/similar?deckCode=FkVdfF-xyOrPQ-FvbvdF",
    );
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.data.source.environmentTitle).toBe("30th CELEBRATION");
    }
  });

  it("環境 ID を添えると env で渡す。形の合わない値は渡さない", async () => {
    fetchMock.mockResolvedValue(Response.json(okBody));

    await getSimilarDecks("FkVdfF-xyOrPQ-FvbvdF", "m6a");
    await getSimilarDecks("FkVdfF-xyOrPQ-FvbvdF", "m6a&x=1");

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://lab.vsrecorder.mobi/api/similar?deckCode=FkVdfF-xyOrPQ-FvbvdF&env=m6a",
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://lab.vsrecorder.mobi/api/similar?deckCode=FkVdfF-xyOrPQ-FvbvdF",
    );
  });

  it("VSLAB_ORIGIN で向き先を変えられる", async () => {
    process.env.VSLAB_ORIGIN = "http://localhost:6757";
    fetchMock.mockResolvedValue(Response.json(okBody));

    await getSimilarDecks("FkVdfF-xyOrPQ-FvbvdF");

    expect(fetchMock.mock.calls[0][0]).toMatch(/^http:\/\/localhost:6757\//);
  });

  it("vslab が理由を返したときは状態として分ける", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: "x" }, { status: 404 }));
    expect((await getSimilarDecks("a")).status).toBe("not_found");

    fetchMock.mockResolvedValueOnce(Response.json({ error: "x" }, { status: 400 }));
    expect((await getSimilarDecks("a")).status).toBe("invalid");

    // 環境を指定して 400 なら、知らない環境(コードの書式は BFF が先に確かめている)
    fetchMock.mockResolvedValueOnce(Response.json({ error: "x" }, { status: 400 }));
    expect((await getSimilarDecks("a", "m5")).status).toBe("unknown_env");

    fetchMock.mockResolvedValueOnce(Response.json({ error: "x" }, { status: 422 }));
    expect((await getSimilarDecks("a")).status).toBe("unreadable");
  });

  it("届かない・5xx・壊れた応答は unavailable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("timeout"));
    expect((await getSimilarDecks("a")).status).toBe("unavailable");

    fetchMock.mockResolvedValueOnce(Response.json({ error: "x" }, { status: 502 }));
    expect((await getSimilarDecks("a")).status).toBe("unavailable");

    fetchMock.mockResolvedValueOnce(Response.json({ unexpected: true }));
    expect((await getSimilarDecks("a")).status).toBe("unavailable");
  });
});
