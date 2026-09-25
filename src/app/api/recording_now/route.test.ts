import { afterEach, describe, expect, it, vi } from "vitest";

/*
 * 画面下の「続きを記録」バーが使う API の応答の形。
 * 判定そのもの(getRecordingNow)は別でテストしているので、ここでは詰め替えだけを見る。
 */
const auth = vi.fn();
vi.mock("@app/auth", () => ({ auth: () => auth() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

const getRecordingNow = vi.fn();
vi.mock("@app/utils/recordingNowServer", () => ({
  getRecordingNow: (...args: unknown[]) => getRecordingNow(...args),
}));

const { GET } = await import("@app/api/recording_now/route");

const data = {
  record: {
    id: "01M2J6M2XH8JVG6VZT4RF889TE",
    official_event_id: 123,
    tonamel_event_id: "",
  },
  eventTitle: "ジムバトル",
  eventIconUrl: "https://example.test/icons/gym.png",
  venue: "カードショップ○○",
  summary: { total: 4, wins: 3, losses: 1, draws: 0 },
  deck: {
    id: "deck-1",
    name: "リザードンex",
    pokemon_sprites: [{ id: "0006", position: 1 }],
  },
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/recording_now", () => {
  it("使用デッキの名前とスプライトを返す(バーに出す分だけ)", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    getRecordingNow.mockResolvedValue(data);

    const body = await (await GET()).json();

    expect(body.recording.deck).toEqual({
      name: "リザードンex",
      pokemon_sprites: [{ id: "0006", position: 1 }],
    });
    expect(body.recording.venue).toBe("カードショップ○○");
    expect(body.recording.eventKind).toBe("official");
  });

  it("使用デッキが未登録なら deck は null", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    getRecordingNow.mockResolvedValue({ ...data, deck: null });

    const body = await (await GET()).json();

    expect(body.recording.deck).toBeNull();
  });

  it("未ログインなら記録中なし", async () => {
    auth.mockResolvedValue(null);

    const body = await (await GET()).json();

    expect(body.recording).toBeNull();
    expect(getRecordingNow).not.toHaveBeenCalled();
  });
});
