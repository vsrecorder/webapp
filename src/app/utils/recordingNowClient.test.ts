import { afterEach, describe, expect, it, vi } from "vitest";

const mutate = vi.fn();
vi.mock("swr", () => ({ mutate: (...args: unknown[]) => mutate(...args) }));

const refreshClientRouterCache = vi.fn(() => Promise.resolve());
vi.mock("@app/actions/routerCache", () => ({
  refreshClientRouterCache: () => refreshClientRouterCache(),
}));

const { refreshRecordingNow, RECORDING_NOW_SWR_KEY } =
  await import("@app/utils/recordingNowClient");

afterEach(() => {
  vi.clearAllMocks();
});

describe("refreshRecordingNow", () => {
  it("画面下のバーの取得結果と、ルーターのキャッシュの両方を捨てる", () => {
    // ルーターのキャッシュを捨てないと、ホームが先読み済みの古い描画(記録中パネル無し)のまま出る
    refreshRecordingNow();

    expect(mutate).toHaveBeenCalledWith(RECORDING_NOW_SWR_KEY);
    expect(refreshClientRouterCache).toHaveBeenCalledTimes(1);
  });

  it("ルーターのキャッシュを捨てるのに失敗しても例外を外へ出さない", async () => {
    refreshClientRouterCache.mockImplementationOnce(() =>
      Promise.reject(new Error("offline")),
    );

    expect(() => refreshRecordingNow()).not.toThrow();
    // 投げっぱなしの Promise の失敗が未処理のまま残らないこと
    await new Promise((r) => setTimeout(r, 0));
  });
});
