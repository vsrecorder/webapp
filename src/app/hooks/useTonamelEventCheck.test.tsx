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

    const { result } = renderHook(() => useTonamelEventCheck("zzzzz"));
    await act(async () => {
      vi.advanceTimersByTime(CHECK_DELAY_MS);
    });

    await waitFor(() => expect(result.current.isInvalidInput).toBe(true));
    expect(result.current.isValid).toBe(false);
    expect(result.current.isUnavailable).toBe(false);
  });

  it("見つからないだけならエラーとして記録しない(打ち間違いで普通に起きるため)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch(notFound);

    const { result } = renderHook(() => useTonamelEventCheck("zzzzz"));
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

  /*
   * IDの形(英数字1〜8文字)に合わない入力は、問い合わせるまでもなく無い。
   * 以前は上流まで届いて 400 になり、中継がそれを 502 にしていたので、日本語入力の変換前の
   * 1文字を打っただけで「上流の失敗」として記録されていた。
   */
  it.each([
    ["日本語入力の変換前の文字", "と"],
    ["全角の記号", "？"],
    ["貼り間違えたデッキコード", "ggNnLL-EBMEEz-Hn969Q"],
    ["スラッシュなどを含む入力", "a/b?c"],
    ["前後の空白", " FoAPg"],
  ])("形に合わない入力(%s)は問い合わせずに無効として示す", async (_label, id) => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const spy = mockFetch(found);

    const { result } = renderHook(() => useTonamelEventCheck(id));

    // 打っている途中は赤くしない(形が違っても、手が止まるまで待つ)
    expect(result.current.isInvalidInput).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(CHECK_DELAY_MS);
    });

    await waitFor(() => expect(result.current.isInvalidInput).toBe(true));
    expect(result.current.isValid).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("中継が 400(IDの形が違う)を返したら無効として示し、エラーとして記録しない", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch(() => ({ ok: false, status: 400, json: async () => ({}) }));

    const { result } = renderHook(() => useTonamelEventCheck("FoAPg"));
    await act(async () => {
      vi.advanceTimersByTime(CHECK_DELAY_MS);
    });

    await waitFor(() => expect(result.current.isInvalidInput).toBe(true));
    expect(result.current.isUnavailable).toBe(false);
    expect(consoleError).not.toHaveBeenCalled();
  });

  /*
   * 通信の失敗や上流の不調では、IDが正しいかどうかは分からない。
   * 以前は「無効なイベントIDです」と出しており、正しいIDを入れた利用者に原因が伝わらなかった。
   */
  describe("確認できなかったとき", () => {
    const RETRY_DELAY_MS = 3000;
    const badGateway = () => ({ ok: false, status: 502, json: async () => ({}) });

    it("上流の失敗(502)は無効とせず、確認できなかったと示す", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch(badGateway);

      const { result } = renderHook(() => useTonamelEventCheck("FoAPg"));
      await act(async () => {
        vi.advanceTimersByTime(CHECK_DELAY_MS);
      });

      await waitFor(() => expect(result.current.isUnavailable).toBe(true));
      expect(result.current.isInvalidInput).toBe(false);
      expect(result.current.isValid).toBe(false);
    });

    it("通信の失敗も、確認できなかったと示す", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const spy = vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      });
      vi.stubGlobal("fetch", spy);

      const { result } = renderHook(() => useTonamelEventCheck("FoAPg"));
      await act(async () => {
        vi.advanceTimersByTime(CHECK_DELAY_MS);
      });

      await waitFor(() => expect(result.current.isUnavailable).toBe(true));
      expect(result.current.isInvalidInput).toBe(false);
    });

    it("入力を変えなくても自動で確認し直し、通れば有効になる", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      // 1回目は失敗(API の入れ替え中など)、2回目から通る
      let calls = 0;
      const spy = mockFetch(() => (++calls === 1 ? badGateway() : found()));

      const { result } = renderHook(() => useTonamelEventCheck("FoAPg"));
      await act(async () => {
        vi.advanceTimersByTime(CHECK_DELAY_MS);
      });
      await waitFor(() => expect(result.current.isUnavailable).toBe(true));
      expect(spy).toHaveBeenCalledTimes(1);

      await act(async () => {
        vi.advanceTimersByTime(RETRY_DELAY_MS);
      });

      await waitFor(() => expect(result.current.isValid).toBe(true));
      expect(result.current.isUnavailable).toBe(false);
      expect(result.current.title).toBe("テスト大会");
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("失敗が続くあいだは、間隔を倍に伸ばしながらやり直す", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const spy = mockFetch(badGateway);

      renderHook(() => useTonamelEventCheck("FoAPg"));
      await act(async () => {
        vi.advanceTimersByTime(CHECK_DELAY_MS);
      });
      await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));

      // 3 秒後に 2 回目
      await act(async () => {
        vi.advanceTimersByTime(RETRY_DELAY_MS);
      });
      await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));

      // 次は 6 秒後。3 秒ではまだ飛ばない
      await act(async () => {
        vi.advanceTimersByTime(RETRY_DELAY_MS);
      });
      expect(spy).toHaveBeenCalledTimes(2);
      await act(async () => {
        vi.advanceTimersByTime(RETRY_DELAY_MS);
      });
      await waitFor(() => expect(spy).toHaveBeenCalledTimes(3));
    });

    it("入力が変わったら、前のIDのやり直しは止める", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const spy = mockFetch((url) => (url.includes("FoAPg") ? badGateway() : found()));

      const { result, rerender } = renderHook(({ id }) => useTonamelEventCheck(id), {
        initialProps: { id: "FoAPg" },
      });
      await act(async () => {
        vi.advanceTimersByTime(CHECK_DELAY_MS);
      });
      await waitFor(() => expect(result.current.isUnavailable).toBe(true));

      rerender({ id: "YFUVY" });
      // 新しいIDの確認が終わるまで、前のIDの「確認できなかった」を出したままにしない
      expect(result.current.isUnavailable).toBe(false);

      await act(async () => {
        vi.advanceTimersByTime(CHECK_DELAY_MS);
      });
      await waitFor(() => expect(result.current.isValid).toBe(true));

      // 前のIDのやり直し(3 秒後)は飛ばない
      await act(async () => {
        vi.advanceTimersByTime(RETRY_DELAY_MS * 4);
      });
      expect(spy.mock.calls.filter(([url]) => String(url).includes("FoAPg")).length).toBe(1);
    });

    it("画面を離れたら、やり直しは止める", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const spy = mockFetch(badGateway);

      const { result, unmount } = renderHook(() => useTonamelEventCheck("FoAPg"));
      await act(async () => {
        vi.advanceTimersByTime(CHECK_DELAY_MS);
      });
      await waitFor(() => expect(result.current.isUnavailable).toBe(true));

      unmount();
      await act(async () => {
        vi.advanceTimersByTime(RETRY_DELAY_MS * 4);
      });

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
