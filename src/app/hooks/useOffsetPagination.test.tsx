// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OffsetPage, useOffsetPagination } from "@app/hooks/useOffsetPagination";

type Item = { id: string };

const getId = (item: Item) => item.id;

// 応答のタイミングをテスト側で握るための Promise
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function page(ids: string[]): OffsetPage<Item, undefined> {
  return { items: ids.map((id) => ({ id })), meta: undefined };
}

describe("useOffsetPagination", () => {
  it("key に対して1ページ目を取り、pageSize 未満なら hasMore は false", async () => {
    const fetchPage = vi.fn(async () => page(["a", "b"]));
    const { result } = renderHook(() =>
      useOffsetPagination<Item>({ key: "k", pageSize: 3, fetchPage, getId }),
    );

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchPage).toHaveBeenCalledWith(0);
    expect(result.current.items.map(getId)).toEqual(["a", "b"]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("もっと見るは次の offset で取り、同じIDが二度届いても1つにする", async () => {
    const fetchPage = vi.fn(async (offset: number) => (offset === 0 ? page(["a", "b"]) : page(["b", "c"])));
    const { result } = renderHook(() =>
      useOffsetPagination<Item>({ key: "k", pageSize: 2, fetchPage, getId }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(fetchPage).toHaveBeenLastCalledWith(2);
    expect(result.current.items.map(getId)).toEqual(["a", "b", "c"]);
    expect(result.current.isLoadingMore).toBe(false);
  });

  it("key が変わったら先頭から読み直し、前の key の遅れた応答は捨てる", async () => {
    const first = deferred<OffsetPage<Item, undefined>>();
    const fetchPage = vi.fn((offset: number) => {
      void offset;
      return fetchPage.mock.calls.length === 1 ? first.promise : Promise.resolve(page(["x"]));
    });
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useOffsetPagination<Item>({ key, pageSize: 10, fetchPage, getId }),
      { initialProps: { key: "k1" } },
    );

    rerender({ key: "k2" });
    await waitFor(() => expect(result.current.items.map(getId)).toEqual(["x"]));

    // k1 の応答が遅れて届いても、いま表示している k2 の一覧は変わらない
    await act(async () => {
      first.resolve(page(["a"]));
      await first.promise;
    });
    expect(result.current.items.map(getId)).toEqual(["x"]);
    expect(result.current.isLoading).toBe(false);
  });

  it("key が変わって読み直している間も lastMeta で直前の付随情報を参照できる", async () => {
    const fetchPage = vi.fn(async (offset: number) => {
      void offset;
      return { items: [{ id: "a" }], meta: { title: fetchPage.mock.calls.length === 1 ? "first" : "second" } };
    });
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) =>
        useOffsetPagination<Item, { title: string }>({ key, pageSize: 10, fetchPage, getId }),
      { initialProps: { key: "k1" } },
    );
    await waitFor(() => expect(result.current.meta?.title).toBe("first"));

    rerender({ key: "k2" });
    expect(result.current.meta).toBeUndefined();
    expect(result.current.lastMeta?.title).toBe("first");

    await waitFor(() => expect(result.current.meta?.title).toBe("second"));
    expect(result.current.lastMeta?.title).toBe("second");
  });

  it("初期値のある key は取得せず、その値をそのまま使う", async () => {
    const fetchPage = vi.fn(async () => page(["from-server"]));
    const { result } = renderHook(() =>
      useOffsetPagination<Item>({
        key: "k",
        pageSize: 20,
        fetchPage,
        getId,
        initial: page(["seed-1", "seed-2"]),
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.items.map(getId)).toEqual(["seed-1", "seed-2"]);
    // effect が走った後も取りに行かない(開発時の StrictMode で二度走っても同じ)
    await act(async () => {});
    expect(fetchPage).not.toHaveBeenCalled();
  });

  // 戻ってきたときに読み込み済みの数ページぶんを戻す用途。件数が pageSize の倍数でなくても、
  // 渡した続きの有無をそのまま使う(件数から決めると「もっと見る」が出たり消えたりする)
  it("初期値に hasMore があれば件数ではなくその値を使う", () => {
    const fetchPage = vi.fn(async () => page([]));
    const { result } = renderHook(() =>
      useOffsetPagination<Item>({
        key: "k",
        pageSize: 2,
        fetchPage,
        getId,
        initial: { ...page(["a", "b", "c", "d"]), hasMore: false },
      }),
    );

    expect(result.current.items.map(getId)).toEqual(["a", "b", "c", "d"]);
    expect(result.current.hasMore).toBe(false);
  });

  /*
   * 戻ってきて控えから描いた一覧を、位置を動かさずに最新へ寄せる。読み込み済みの範囲を
   * ページごとに取り直し、手元にある項目の中身だけを差し替える(足さない・除かない)。
   * 取り直しの最中に手元で差し替えた項目(いいねを押した直後など)は上書きしない。
   */
  it("refreshItems は読み込み済みの範囲を取り直し、手元の項目の中身だけを新しくする", async () => {
    type Liked = { id: string; likes: number };
    const pending = deferred<OffsetPage<Liked, undefined>>();
    const second = deferred<OffsetPage<Liked, undefined>>();
    const fetchPage = vi.fn((offset: number) => (offset === 0 ? pending.promise : second.promise));
    const { result } = renderHook(() =>
      useOffsetPagination<Liked>({
        key: "k",
        pageSize: 2,
        fetchPage,
        getId: (item) => item.id,
        initial: {
          items: [
            { id: "a", likes: 0 },
            { id: "b", likes: 0 },
            { id: "c", likes: 0 },
          ],
          meta: undefined,
          hasMore: false,
        },
      }),
    );

    let refreshing!: Promise<void>;
    act(() => {
      refreshing = result.current.refreshItems();
    });
    expect(fetchPage.mock.calls.map(([offset]) => offset)).toEqual([0, 2]);

    // 取り直しの最中に c にいいねした
    act(() => result.current.updateItem({ id: "c", likes: 1 }));

    await act(async () => {
      pending.resolve({ items: [{ id: "new", likes: 0 }, { id: "a", likes: 3 }], meta: undefined });
      second.resolve({ items: [{ id: "b", likes: 5 }, { id: "c", likes: 0 }], meta: undefined });
      await refreshing;
    });

    expect(result.current.items).toEqual([
      { id: "a", likes: 3 },
      { id: "b", likes: 5 },
      { id: "c", likes: 1 },
    ]);
    expect(result.current.hasMore).toBe(false);
  });

  it("もっと見るの途中で key が変わっても読み込み中のままにならず、古い応答も混ざらない", async () => {
    const more = deferred<OffsetPage<Item, undefined>>();
    const fetchPage = vi.fn((offset: number) => {
      if (offset > 0) return more.promise;
      return Promise.resolve(page(fetchPage.mock.calls.length === 1 ? ["a", "b"] : ["x", "y"]));
    });
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useOffsetPagination<Item>({ key, pageSize: 2, fetchPage, getId }),
      { initialProps: { key: "k1" } },
    );
    await waitFor(() => expect(result.current.items.map(getId)).toEqual(["a", "b"]));

    act(() => {
      void result.current.loadMore();
    });
    expect(result.current.isLoadingMore).toBe(true);

    rerender({ key: "k2" });
    expect(result.current.isLoadingMore).toBe(false);
    await waitFor(() => expect(result.current.items.map(getId)).toEqual(["x", "y"]));

    await act(async () => {
      more.resolve(page(["c"]));
      await more.promise;
    });
    expect(result.current.items.map(getId)).toEqual(["x", "y"]);
    expect(result.current.isLoadingMore).toBe(false);
  });

  it("updateItem は同じIDの項目だけを差し替える", async () => {
    type Post = { id: string; likes: number };
    const fetchPage = vi.fn(async () => ({
      items: [
        { id: "a", likes: 0 },
        { id: "b", likes: 0 },
      ],
      meta: undefined,
    }));
    const { result } = renderHook(() =>
      useOffsetPagination<Post>({ key: "k", pageSize: 10, fetchPage, getId: (p) => p.id }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updateItem({ id: "b", likes: 3 });
    });

    expect(result.current.items).toEqual([
      { id: "a", likes: 0 },
      { id: "b", likes: 3 },
    ]);
  });

  it("取得に失敗したら error に入り、読み込み中は解ける", async () => {
    const fetchPage = vi.fn(async () => {
      throw new Error("boom");
    });
    const { result } = renderHook(() =>
      useOffsetPagination<Item>({ key: "k", pageSize: 10, fetchPage, getId }),
    );

    await waitFor(() => expect(result.current.error?.message).toBe("boom"));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.items).toEqual([]);
  });

  it("key が null の間は取得しない", async () => {
    const fetchPage = vi.fn(async () => page(["a"]));
    const { result } = renderHook(() =>
      useOffsetPagination<Item>({ key: null, pageSize: 10, fetchPage, getId }),
    );

    await act(async () => {});
    expect(fetchPage).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.items).toEqual([]);
  });
});
