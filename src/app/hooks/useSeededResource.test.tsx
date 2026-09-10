// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useSeededResource } from "@app/hooks/useSeededResource";

describe("useSeededResource", () => {
  it("初期値があれば取得せず、そのまま返す", () => {
    const fetcher = vi.fn(async () => ({ name: "fetched" }));
    const initial = { name: "initial" };
    const { result } = renderHook(() => useSeededResource("d1", fetcher, initial));

    expect(result.current.data).toEqual({ name: "initial" });
    expect(result.current.loading).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("レンダーごとに新しい(同じ内容の)初期値を渡されても更新を繰り返さない", () => {
    const fetcher = vi.fn(async () => ({ name: "fetched" }));
    let renders = 0;
    const { result, rerender } = renderHook(() => {
      renders++;
      return useSeededResource("d1", fetcher, { name: "initial" });
    });

    rerender();
    expect(result.current.data).toEqual({ name: "initial" });
    expect(renders).toBeLessThanOrEqual(3);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("初期値が無ければ key で取得する", async () => {
    const fetcher = vi.fn(async (id: string) => ({ id }));
    const { result } = renderHook(() => useSeededResource("d1", fetcher));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetcher).toHaveBeenCalledWith("d1");
    expect(result.current.data).toEqual({ id: "d1" });
    expect(result.current.error).toBe(false);
  });

  it("key が無ければ何もしない(読み込み中にもならない)", () => {
    const fetcher = vi.fn(async () => ({}));
    const { result: empty } = renderHook(() => useSeededResource("", fetcher));
    const { result: zero } = renderHook(() => useSeededResource(0, fetcher));

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
    const { result } = renderHook(() => useSeededResource("d1", fetcher));

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
    const { result } = renderHook(() => useSeededResource("d1", fetcher, initial));

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.data).toEqual({ name: "fetched" }));
  });

  it("初期値が別の内容に変わったら差し替える", () => {
    const fetcher = vi.fn(async () => ({ name: "fetched" }));
    const { result, rerender } = renderHook(
      ({ initial }: { initial: { name: string } }) =>
        useSeededResource("d1", fetcher, initial),
      { initialProps: { initial: { name: "first" } } },
    );

    rerender({ initial: { name: "second" } });
    expect(result.current.data).toEqual({ name: "second" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fetcher がインラインの関数でも取得を繰り返さない", async () => {
    const calls = vi.fn(async (id: string) => ({ id }));
    const { result, rerender } = renderHook(() =>
      useSeededResource("d1", (id: string) => calls(id)),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender();
    rerender();
    expect(calls).toHaveBeenCalledTimes(1);
  });
});

describe("useSeededResource: 鍵の変更", () => {
  it("初期値があっても key が変わったら取り直す", async () => {
    const fetcher = vi.fn(async (id: string) => ({ name: `fetched-${id}` }));
    const initial = { name: "initial" };
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useSeededResource(key, fetcher, initial),
      { initialProps: { key: "d1" } },
    );
    expect(fetcher).not.toHaveBeenCalled();

    rerender({ key: "d2" });
    await waitFor(() => expect(result.current.data).toEqual({ name: "fetched-d2" }));
    expect(fetcher).toHaveBeenCalledWith("d2");
  });

  it("setData で取得した値を差し替えられる(関数型の更新も受ける)", async () => {
    const fetcher = vi.fn(async (id: string) => ({ id, name: "a" }));
    const { result } = renderHook(() => useSeededResource("d1", fetcher));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setData({ id: "d1", name: "b" }));
    expect(result.current.data).toEqual({ id: "d1", name: "b" });

    act(() => result.current.setData((prev) => (prev ? { ...prev, name: "c" } : prev)));
    expect(result.current.data).toEqual({ id: "d1", name: "c" });
    expect(result.current.error).toBe(false);
  });

  it("refreshKey が変わると同じ鍵でも取り直す(初期値があっても)", async () => {
    const fetcher = vi.fn(async (id: string) => ({ id, name: "fetched" }));
    const { result, rerender } = renderHook(
      ({ refreshKey }) =>
        useSeededResource("d1", fetcher, { id: "d1", name: "initial" }, { refreshKey }),
      { initialProps: { refreshKey: 0 } },
    );
    expect(fetcher).not.toHaveBeenCalled();

    rerender({ refreshKey: 1 });
    await waitFor(() => expect(result.current.data).toEqual({ id: "d1", name: "fetched" }));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  /*
   * 鍵を戻したときも取り直す。
   *
   * 「初期値があるなら取りに行かない」を鍵の一致だけで判定すると、別の鍵で取り直したあとに
   * マウント時の鍵へ戻ってきたときも取得を省いてしまい、表示は別の鍵の値のまま止まる。
   * 戦績の「不戦勝・不戦敗を除く」を切り替えても数字が変わらない不具合がこれだった。
   */
  it("別の鍵で取り直したあとマウント時の鍵へ戻っても取り直す", async () => {
    const fetcher = vi.fn(async (id: string) => ({ name: `fetched-${id}` }));
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) =>
        // 初期値はマウント時の鍵に対応する値なので、別の鍵のときは渡さない
        useSeededResource(key, fetcher, key === "d1" ? { name: "initial" } : undefined),
      { initialProps: { key: "d1" } },
    );
    expect(fetcher).not.toHaveBeenCalled();

    rerender({ key: "d2" });
    await waitFor(() => expect(result.current.data).toEqual({ name: "fetched-d2" }));

    rerender({ key: "d1" });
    await waitFor(() => expect(result.current.data).toEqual({ name: "fetched-d1" }));
    expect(fetcher).toHaveBeenLastCalledWith("d1");
  });
});
