// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useKizunaDecksState } from "@app/hooks/useKizunaLevels";

import { KizunaType } from "@app/types/kizuna";

// サーバ描画で取ったきずな(デッキ登録前)
const beforeCreate = {
  user_id: "u1",
  decks: [{ deck_id: "d1", level: 40 }],
} as unknown as KizunaType;

// 登録後に取り直したきずな(新しいデッキ d2 を含む)
const afterCreate = {
  user_id: "u1",
  decks: [
    { deck_id: "d1", level: 40 },
    { deck_id: "d2", level: 1 },
  ],
} as unknown as KizunaType;

// デッキ一覧は作り直しても同じ SWR キャッシュを使うので、マウントをまたいで同じ Map を渡す
function createWrapper() {
  const cache = new Map();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SWRConfig value={{ provider: () => cache, dedupingInterval: 0 }}>
        {children}
      </SWRConfig>
    );
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useKizunaDecksState", () => {
  it("いま取られた初期値があればマウント時に取り直さない", async () => {
    const fetchMock = vi.fn(
      async () => ({ ok: true, json: async () => afterCreate }) as Response,
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(
      () => useKizunaDecksState("u1", beforeCreate, true),
      { wrapper: createWrapper() },
    );

    expect(result.current.decks.get("d1")?.level).toBe(40);
    expect(result.current.isLoading).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("登録後の作り直しで初期値を渡さなければ、新しいデッキのきずなを取り直す", async () => {
    const fetchMock = vi.fn(
      async () => ({ ok: true, json: async () => afterCreate }) as Response,
    );
    vi.stubGlobal("fetch", fetchMock);
    const wrapper = createWrapper();

    // ページを開いた時点(サーバ描画の値)
    const first = renderHook(() => useKizunaDecksState("u1", beforeCreate, true), {
      wrapper,
    });
    expect(first.result.current.decks.has("d2")).toBe(false);
    first.unmount();

    // 登録後の作り直し。サーバ描画の値は渡さない(TemplateDecks の isServerAggregateUsable)
    const { result } = renderHook(() => useKizunaDecksState("u1", undefined, true), {
      wrapper,
    });

    // 取り直しの間は古いキャッシュを出したまま、取り直し中であることを伝える
    // (一覧はこれを見て、きずなの無いデッキがあれば最初の表示を待つ)
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isValidating).toBe(true);
    expect(result.current.decks.has("d2")).toBe(false);

    await waitFor(() => expect(result.current.decks.get("d2")?.level).toBe(1));
    expect(result.current.isValidating).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("サーバ描画の古い値を渡し直すと取り直さない(登録後に渡してはいけない理由)", async () => {
    const fetchMock = vi.fn(
      async () => ({ ok: true, json: async () => afterCreate }) as Response,
    );
    vi.stubGlobal("fetch", fetchMock);
    const wrapper = createWrapper();

    const first = renderHook(() => useKizunaDecksState("u1", beforeCreate, true), {
      wrapper,
    });
    first.unmount();

    const { result } = renderHook(() => useKizunaDecksState("u1", beforeCreate, true), {
      wrapper,
    });

    // 新しいデッキのきずなLv.が出ないまま(デッキ登録直後の不具合の形)
    expect(result.current.decks.has("d2")).toBe(false);
    expect(result.current.isValidating).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
