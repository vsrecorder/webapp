import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mutate = vi.fn();
const refreshRecordingNow = vi.fn();

vi.mock("swr", () => ({ mutate: (...args: unknown[]) => mutate(...args) }));
vi.mock("@app/utils/recordingNowClient", () => ({
  refreshRecordingNow: () => refreshRecordingNow(),
}));

import {
  fetchDeckCodeForCard,
  notifyDeckCodeSpritesChanged,
  subscribeDeckCodeSprites,
} from "@app/utils/deckCodeSpriteClient";

// 応答を手元で解決できる fetch。呼ばれた回数と、いつ返すかをテストから決める
type Pending = { url: string; resolve: (body: unknown, ok?: boolean) => void };
let pending: Pending[] = [];

beforeEach(() => {
  pending = [];
  mutate.mockReset();
  refreshRecordingNow.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (url: string) =>
        new Promise((resolve) => {
          pending.push({
            url,
            resolve: (body, ok = true) => resolve({ ok, json: async () => body }),
          });
        }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchDeckCodeForCard", () => {
  it("取得中の同じバージョンは1本を分け合い、カードに要る項目だけを返す", async () => {
    const first = fetchDeckCodeForCard("dc1");
    const second = fetchDeckCodeForCard("dc1");

    expect(pending).toHaveLength(1);
    expect(pending[0].url).toBe("/api/deckcodes/dc1");

    pending[0].resolve({
      id: "dc1",
      code: "xxxxxx-xxxxxx-xxxxxx",
      pokemon_sprites: [{ id: "0887", position: 1 }],
    });

    const expected = { id: "dc1", pokemon_sprites: [{ id: "0887", position: 1 }] };
    expect(await first).toEqual(expected);
    expect(await second).toEqual(expected);
  });

  it("別のバージョンは別に取る", () => {
    void fetchDeckCodeForCard("dc1");
    void fetchDeckCodeForCard("dc2");

    expect(pending.map((p) => p.url)).toEqual(["/api/deckcodes/dc1", "/api/deckcodes/dc2"]);

    for (const p of pending) p.resolve({ id: "x" });
  });

  it("終わったあとの取得は新しく取りに行く(結果を抱え込まない)", async () => {
    const first = fetchDeckCodeForCard("dc1");
    pending[0].resolve({ id: "dc1", pokemon_sprites: [] });
    await first;

    const second = fetchDeckCodeForCard("dc1");
    expect(pending).toHaveLength(2);
    pending[1].resolve({ id: "dc1", pokemon_sprites: [{ id: "0006", position: 1 }] });

    expect((await second).pokemon_sprites).toEqual([{ id: "0006", position: 1 }]);
  });

  it("失敗は分け合った全員に伝わり、次の取得は取り直せる", async () => {
    const first = fetchDeckCodeForCard("dc1");
    const second = fetchDeckCodeForCard("dc1");
    pending[0].resolve({}, false);

    await expect(first).rejects.toThrow();
    await expect(second).rejects.toThrow();

    void fetchDeckCodeForCard("dc1");
    expect(pending).toHaveLength(2);
    pending[1].resolve({ id: "dc1" });
  });

  it("スプライトを返さない古い上流なら空(デッキのものを出す)にする", async () => {
    const request = fetchDeckCodeForCard("dc1");
    pending[0].resolve({ id: "dc1" });

    expect(await request).toEqual({ id: "dc1", pokemon_sprites: [] });
  });
});

describe("notifyDeckCodeSpritesChanged", () => {
  const changed = { id: "dc1", pokemon_sprites: [{ id: "0006", position: 2 }] };

  it("購読しているカードへ保存した値を配り、解除したカードには配らない", () => {
    const kept = vi.fn();
    const removed = vi.fn();
    const unsubscribeKept = subscribeDeckCodeSprites(kept);
    subscribeDeckCodeSprites(removed)();

    notifyDeckCodeSpritesChanged(changed);

    expect(kept).toHaveBeenCalledWith(changed);
    expect(removed).not.toHaveBeenCalled();

    unsubscribeKept();
  });

  it("1枚のカードが失敗しても残りへ配る", () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = vi.fn(() => {
      throw new Error("boom");
    });
    const healthy = vi.fn();
    const unsubscribeBroken = subscribeDeckCodeSprites(broken);
    const unsubscribeHealthy = subscribeDeckCodeSprites(healthy);

    notifyDeckCodeSpritesChanged(changed);

    expect(healthy).toHaveBeenCalledWith(changed);

    unsubscribeBroken();
    unsubscribeHealthy();
    errorLog.mockRestore();
  });

  it("カレンダーのキャッシュだけを取り直させ、「記録中」のバーも取り直す", () => {
    notifyDeckCodeSpritesChanged(changed);

    expect(refreshRecordingNow).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(1);

    const matcher = mutate.mock.calls[0][0] as (key: unknown) => boolean;
    expect(matcher("/api/users/u1/calendar")).toBe(true);
    expect(matcher("/api/users/u1/kizuna")).toBe(false);
    expect(matcher("/api/decks/d1/deckcodes")).toBe(false);
    expect(matcher(["/api/users/u1/calendar"])).toBe(false);
  });

  it("保存より前に始まっていた取得は分け合わせない(保存前の値を掴ませない)", async () => {
    const before = fetchDeckCodeForCard("dc1");

    notifyDeckCodeSpritesChanged(changed);

    const after = fetchDeckCodeForCard("dc1");
    expect(pending).toHaveLength(2);

    // 古い取得があとから終わっても、新しい取得を手放させない
    pending[0].resolve({ id: "dc1", pokemon_sprites: [] });
    await before;
    void fetchDeckCodeForCard("dc1");
    expect(pending).toHaveLength(2);

    pending[1].resolve({ id: "dc1", pokemon_sprites: changed.pokemon_sprites });
    expect((await after).pokemon_sprites).toEqual(changed.pokemon_sprites);
  });
});
