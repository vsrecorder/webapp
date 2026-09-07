// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useRecordCardResource } from "@app/hooks/useRecordCardResource";

describe("useRecordCardResource", () => {
  it("初期値があれば取得せず、そのまま返す", () => {
    const fetcher = vi.fn(async () => ({ name: "fetched" }));
    const initial = { name: "initial" };
    const { result } = renderHook(() => useRecordCardResource("d1", fetcher, initial));

    expect(result.current.data).toEqual({ name: "initial" });
    expect(result.current.loading).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("レンダーごとに新しい(同じ内容の)初期値を渡されても更新を繰り返さない", () => {
    const fetcher = vi.fn(async () => ({ name: "fetched" }));
    let renders = 0;
    const { result, rerender } = renderHook(() => {
      renders++;
      return useRecordCardResource("d1", fetcher, { name: "initial" });
    });

    rerender();
    expect(result.current.data).toEqual({ name: "initial" });
    expect(renders).toBeLessThanOrEqual(3);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("初期値が無ければ key で取得する", async () => {
    const fetcher = vi.fn(async (id: string) => ({ id }));
    const { result } = renderHook(() => useRecordCardResource("d1", fetcher));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetcher).toHaveBeenCalledWith("d1");
    expect(result.current.data).toEqual({ id: "d1" });
    expect(result.current.error).toBe(false);
  });

  it("key が無ければ何もしない(読み込み中にもならない)", () => {
    const fetcher = vi.fn(async () => ({}));
    const { result: empty } = renderHook(() => useRecordCardResource("", fetcher));
    const { result: zero } = renderHook(() => useRecordCardResource(0, fetcher));

    expect(empty.current.loading).toBe(false);
    expect(zero.current.loading).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("失敗したら error になり、retry で取り直す", async () => {
    const fetcher = vi
      .fn<(id: string) => Promise<{ id: string }>>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ id: "ok" });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { result } = renderHook(() => useRecordCardResource("d1", fetcher));

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.loading).toBe(false);

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.data).toEqual({ id: "ok" }));
    expect(result.current.error).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
    log.mockRestore();
  });

  it("初期値があっても retry では取得する", async () => {
    const fetcher = vi.fn(async () => ({ name: "fetched" }));
    const initial = { name: "initial" };
    const { result } = renderHook(() => useRecordCardResource("d1", fetcher, initial));

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.data).toEqual({ name: "fetched" }));
  });

  it("初期値が別の内容に変わったら差し替える", () => {
    const fetcher = vi.fn(async () => ({ name: "fetched" }));
    const { result, rerender } = renderHook(
      ({ initial }: { initial: { name: string } }) =>
        useRecordCardResource("d1", fetcher, initial),
      { initialProps: { initial: { name: "first" } } },
    );

    rerender({ initial: { name: "second" } });
    expect(result.current.data).toEqual({ name: "second" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fetcher がインラインの関数でも取得を繰り返さない", async () => {
    const calls = vi.fn(async (id: string) => ({ id }));
    const { result, rerender } = renderHook(() =>
      useRecordCardResource("d1", (id: string) => calls(id)),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender();
    rerender();
    expect(calls).toHaveBeenCalledTimes(1);
  });
});

describe("useRecordCardResource: 鍵の変更", () => {
  it("初期値があっても key が変わったら取り直す", async () => {
    const fetcher = vi.fn(async (id: string) => ({ name: `fetched-${id}` }));
    const initial = { name: "initial" };
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useRecordCardResource(key, fetcher, initial),
      { initialProps: { key: "d1" } },
    );
    expect(fetcher).not.toHaveBeenCalled();

    rerender({ key: "d2" });
    await waitFor(() => expect(result.current.data).toEqual({ name: "fetched-d2" }));
    expect(fetcher).toHaveBeenCalledWith("d2");
  });
});
