// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useNavPendingHref } from "./useNavPendingHref";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useNavPendingHref", () => {
  function setup(initialPathname: string) {
    return renderHook(({ pathname }) => useNavPendingHref(pathname), {
      initialProps: { pathname: initialPathname },
    });
  }

  it("押した項目は遷移先に着くまで pending になる", () => {
    const { result, rerender } = setup("/");

    act(() => result.current.markPending("/decks"));
    expect(result.current.pending).toBe("/decks");

    rerender({ pathname: "/decks" });
    expect(result.current.pending).toBeNull();
  });

  it("今いるページの項目を押しても pending にしない", () => {
    const { result } = setup("/decks");

    act(() => result.current.markPending("/decks"));
    expect(result.current.pending).toBeNull();
  });

  /*
   * 着いた後にナビ以外(ページ内のリンク・戻る)で別ページへ移ったとき、前に押した項目が
   * 「まだ着いていない」と見なされて選択中の色に戻っていた。
   */
  it("着いた後にナビ以外で別ページへ移っても、前に押した項目を pending に戻さない", () => {
    const { result, rerender } = setup("/");

    act(() => result.current.markPending("/decks"));
    rerender({ pathname: "/decks" });
    rerender({ pathname: "/records/abc" });
    expect(result.current.pending).toBeNull();

    // 戻るで押す前のページに帰っても同じ
    rerender({ pathname: "/" });
    expect(result.current.pending).toBeNull();
  });

  it("遷移が起きなければ時間で解除する", () => {
    vi.useFakeTimers();
    const { result } = setup("/");

    act(() => result.current.markPending("/decks"));
    expect(result.current.pending).toBe("/decks");

    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.pending).toBeNull();
  });
});
