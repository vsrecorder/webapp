// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTonamelEventCheck } from "@app/hooks/useTonamelEventCheck";

const CHECK_DELAY_MS = 500;

function mockFetch(handler: (url: string) => Partial<Response> & { json?: () => Promise<unknown> }) {
  const spy = vi.fn(async (url: string) => handler(url) as Response);
  vi.stubGlobal("fetch", spy);
  return spy;
}

const found = () => ({
  ok: true,
  status: 200,
  json: async () => ({ title: "テスト大会", image: "https://example.test/a.png" }),
});
const notFound = () => ({ ok: false, status: 404, json: async () => ({}) });

describe("useTonamelEventCheck", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("未入力では問い合わせない", async () => {
    const spy = mockFetch(found);

    renderHook(() => useTonamelEventCheck(""));
    await act(async () => {
      vi.advanceTimersByTime(CHECK_DELAY_MS * 2);
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("手が止まってから1回だけ問い合わせる", async () => {
    const spy = mockFetch(found);

    // 1文字ずつ増える入力(打鍵のたびに再描画される)
    const { rerender } = renderHook(({ id }) => useTonamelEventCheck(id), {
      initialProps: { id: "F" },
    });
    for (const id of ["Fo", "FoA", "FoAP", "FoAPg"]) {
      rerender({ id });
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
    }

    // まだ待ち時間に達していないので1回も飛んでいない
    expect(spy).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(CHECK_DELAY_MS);
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain("FoAPg");
  });

  it("見つかればイベント名と画像を返す", async () => {
    mockFetch(found);

    const { result } = renderHook(() => useTonamelEventCheck("FoAPg"));
    await act(async () => {
      vi.advanceTimersByTime(CHECK_DELAY_MS);
    });

    await waitFor(() => expect(result.current.isValid).toBe(true));
    expect(result.current.title).toBe("テスト大会");
    expect(result.current.isInvalidInput).toBe(false);
  });

  it("見つからなければ入力を無効として示す", async () => {
    mockFetch(notFound);

    const { result } = renderHook(() => useTonamelEventCheck("ggNnLL-EBMEEz-Hn969Q"));
    await act(async () => {
      vi.advanceTimersByTime(CHECK_DELAY_MS);
    });

    await waitFor(() => expect(result.current.isInvalidInput).toBe(true));
    expect(result.current.isValid).toBe(false);
  });

  it("見つからないだけならエラーとして記録しない(打ち間違いで普通に起きるため)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch(notFound);

    const { result } = renderHook(() => useTonamelEventCheck("？"));
    await act(async () => {
      vi.advanceTimersByTime(CHECK_DELAY_MS);
    });

    await waitFor(() => expect(result.current.isInvalidInput).toBe(true));
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("確認が終わるまでは入力を赤くしない", () => {
    mockFetch(found);

    const { result } = renderHook(() => useTonamelEventCheck("FoAPg"));

    expect(result.current.isInvalidInput).toBe(false);
    expect(result.current.isValid).toBe(false);
  });

  it("IDが変わったら前のIDの結果は出さない", async () => {
    mockFetch((url) => (url.includes("FoAPg") ? found() : notFound()));

    const { result, rerender } = renderHook(({ id }) => useTonamelEventCheck(id), {
      initialProps: { id: "FoAPg" },
    });
    await act(async () => {
      vi.advanceTimersByTime(CHECK_DELAY_MS);
    });
    await waitFor(() => expect(result.current.title).toBe("テスト大会"));

    rerender({ id: "zzzzz" });

    // 新しいIDの確認が終わるまで、前のイベント名を出したままにしない
    expect(result.current.title).toBe("");
    expect(result.current.isValid).toBe(false);
  });

  it("スラッシュなどを含む入力でもURLとして壊れない", async () => {
    const spy = mockFetch(notFound);

    renderHook(() => useTonamelEventCheck("a/b?c"));
    await act(async () => {
      vi.advanceTimersByTime(CHECK_DELAY_MS);
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe("/api/tonamel_events/a%2Fb%3Fc");
  });
});
