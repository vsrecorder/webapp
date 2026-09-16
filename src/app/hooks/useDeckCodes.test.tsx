// @vitest-environment jsdom
import { ReactNode } from "react";

import { act, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  deckCodesKey,
  getDeckCodeVersionNumber,
  useDeckCodes,
  useRevalidateDeckCodes,
} from "@app/hooks/useDeckCodes";
import { DeckCodeType } from "@app/types/deck_code";

// 取得のたびに中身が変わるので、キャッシュが使われたか取り直したかを件数で判別できる
function makeDeckCodes(count: number): DeckCodeType[] {
  return Array.from({ length: count }, (_, i) => ({ id: `dc${count - i}` }) as DeckCodeType);
}

// SWR のキャッシュはテスト間で持ち越さない
function wrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/*
 * サーバ上のバージョン件数を持つ fetch のスタブ。
 * テスト側で count を書き換えると、次に取り直したときだけ新しい件数が返る
 * (取り直しが起きなければ古い件数のまま＝今回直したバグの再現になる)。
 */
function stubFetch(initialCount: number) {
  const state = { count: initialCount, calls: [] as string[] };

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      state.calls.push(url);

      return {
        ok: true,
        json: async () => makeDeckCodes(state.count),
      } as Response;
    }),
  );

  return state;
}

describe("useDeckCodes", () => {
  it("デッキIDが無ければ取得しない", () => {
    const server = stubFetch(3);
    renderHook(() => useDeckCodes(null, null), { wrapper });

    expect(server.calls).toHaveLength(0);
  });

  it("デッキIDの一覧を取得する", async () => {
    stubFetch(3);
    const { result } = renderHook(() => useDeckCodes("deck1", "dc3"), { wrapper });

    await waitFor(() => expect(result.current.deckcodes).toHaveLength(3));
  });

  it("表示中のバージョンが変わると取り直す", async () => {
    const server = stubFetch(3);
    const { result, rerender } = renderHook(
      ({ watch }: { watch: string }) => useDeckCodes("deck1", watch),
      { wrapper, initialProps: { watch: "dc3" } },
    );

    await waitFor(() => expect(result.current.deckcodes).toHaveLength(3));

    // 新バージョンを作ると、サーバ側が増えて表示中のIDも変わる
    server.count = 4;
    rerender({ watch: "dc4" });

    await waitFor(() => expect(result.current.deckcodes).toHaveLength(4));
  });

  /*
   * 表示中でないバージョンを削除したときは、表示中のIDが変わらないので
   * useDeckCodes 自身の取り直しは働かない。件数が古いまま残らないよう、
   * 削除した側から useRevalidateDeckCodes を呼んで揃える。
   */
  it("表示中のIDが変わらなくても、取り直しを呼べば件数が更新される", async () => {
    const server = stubFetch(3);
    const { result } = renderHook(
      () => ({
        codes: useDeckCodes("deck1", "dc3"),
        revalidate: useRevalidateDeckCodes(),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.codes.deckcodes).toHaveLength(3));

    // 表示中(dc3)ではないバージョンを削除した状況。表示中のIDは変わらない
    server.count = 2;

    await act(async () => {
      await result.current.revalidate("deck1");
    });

    await waitFor(() => expect(result.current.codes.deckcodes).toHaveLength(2));
  });

  it("取り直しはデッキIDが無ければ何もしない", async () => {
    const server = stubFetch(3);
    const { result } = renderHook(() => useRevalidateDeckCodes(), { wrapper });

    await act(async () => {
      await result.current(null);
      await result.current(undefined);
    });

    expect(server.calls).toHaveLength(0);
  });

  it("deckCodesKey は同じデッキで同じ鍵を返す", () => {
    expect(deckCodesKey("deck1")).toBe(deckCodesKey("deck1"));
    expect(deckCodesKey("deck1")).not.toBe(deckCodesKey("deck2"));
  });
});

describe("getDeckCodeVersionNumber", () => {
  it("降順の一覧から、古い順の通し番号を返す", () => {
    const deckcodes = makeDeckCodes(3); // dc3(新), dc2, dc1(古)

    expect(getDeckCodeVersionNumber(deckcodes, "dc1")).toBe(1);
    expect(getDeckCodeVersionNumber(deckcodes, "dc3")).toBe(3);
  });

  it("未取得・対象なし・想定外の応答では null を返す", () => {
    expect(getDeckCodeVersionNumber(undefined, "dc1")).toBeNull();
    expect(getDeckCodeVersionNumber(makeDeckCodes(3), "missing")).toBeNull();
    expect(getDeckCodeVersionNumber(makeDeckCodes(3), null)).toBeNull();
  });
});
