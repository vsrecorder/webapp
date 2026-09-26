import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getDeckArchetypesByCodes,
  getDeckArchetypesByEvent,
} from "@app/utils/deckArchetypeServer";

const entry = (deckCode: string) => ({
  deckCode,
  archetypeName: "ドラパルトex",
  variantName: null,
  label: "ドラパルトex",
  sprites: ["0887"],
});

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

describe("getDeckArchetypesByEvent", () => {
  it("vslab の大会指定の口を引き、デッキコード → 種類の辞書にする", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ rulesVersion: "v1", decks: { "a-1": entry("a-1") }, notFound: [] }),
    );

    const map = await getDeckArchetypesByEvent(1115603);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://lab.vsrecorder.mobi/api/archetypes/classify?event=1115603",
    );
    expect(map["a-1"].label).toBe("ドラパルトex");
  });

  it("VSLAB_ORIGIN で向き先を変えられる", async () => {
    process.env.VSLAB_ORIGIN = "http://localhost:6757";
    fetchMock.mockResolvedValue(Response.json({ decks: {} }));

    await getDeckArchetypesByEvent(1);

    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://localhost:6757/api/archetypes/classify?event=1",
    );
  });

  it("索引に無い大会(404)は静かに空、それ以外の失敗は警告して空", async () => {
    fetchMock.mockResolvedValueOnce(new Response("not found", { status: 404 }));
    expect(await getDeckArchetypesByEvent(1)).toEqual({});
    expect(console.warn).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(new Response("error", { status: 500 }));
    expect(await getDeckArchetypesByEvent(1)).toEqual({});
    expect(console.warn).toHaveBeenCalledTimes(1);

    fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    expect(await getDeckArchetypesByEvent(1)).toEqual({});
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it("大会 ID でないものは引かない", async () => {
    expect(await getDeckArchetypesByEvent(0)).toEqual({});
    expect(await getDeckArchetypesByEvent(Number.NaN)).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("getDeckArchetypesByCodes", () => {
  it("100 件ごとに分けて引き、1 つの辞書にまとめる", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      const codes = decodeURIComponent(new URL(url).searchParams.get("codes") ?? "").split(",");
      return Response.json({
        decks: Object.fromEntries(codes.map((code) => [code, entry(code)])),
        notFound: [],
      });
    });

    const codes = Array.from({ length: 150 }, (_, i) => `code-${String(i).padStart(3, "0")}`);
    const map = await getDeckArchetypesByCodes([...codes, ...codes]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(Object.keys(map)).toHaveLength(150);
    expect(map["code-149"].deckCode).toBe("code-149");
  });

  it("形の合わないコードは送らず、空なら引かない", async () => {
    fetchMock.mockResolvedValue(Response.json({ decks: {} }));

    expect(await getDeckArchetypesByCodes(["", "bad code"])).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("一部の塊が失敗しても残りは返す", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ decks: { "a-1": entry("a-1") } }))
      .mockResolvedValueOnce(new Response("error", { status: 502 }));

    const codes = Array.from({ length: 101 }, (_, i) => `code-${String(i).padStart(3, "0")}`);
    const map = await getDeckArchetypesByCodes(codes);

    expect(map).toEqual({ "a-1": entry("a-1") });
  });
});
