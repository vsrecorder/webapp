// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useOffsetPagination } from "@app/hooks/useOffsetPagination";

type Item = { id: string };

describe("useOffsetPagination", () => {
  it("失敗した条件へ戻って再取得が成功すると、エラーが消えて一覧が出る", async () => {
    let mode: "fail" | "ok" = "fail";
    const fetchPage = vi.fn(async () => {
      if (mode === "fail") throw new Error("boom");
      return { items: [{ id: "1" }] as Item[], meta: undefined };
    });

    const props = {
      pageSize: 10,
      fetchPage,
      getId: (item: Item) => item.id,
    };

    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useOffsetPagination<Item>({ key, ...props }),
      { initialProps: { key: "A" } },
    );

    // 条件 A の取得が失敗 → エラー表示、骨格は出ない
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.items).toEqual([]);

    // 条件 B は成功する
    mode = "ok";
    rerender({ key: "B" });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.error).toBeNull();

    // 条件 A へ戻ると再取得が走る。成功すればエラーは残らず一覧が出る
    rerender({ key: "A" });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.error).toBeNull();
  });

  it("再取得の開始時にその条件のエラーを消し、読み込み中は骨格を出す", async () => {
    let resolve: (v: { items: Item[]; meta: undefined }) => void = () => {};
    let mode: "fail" | "pending" = "fail";
    const fetchPage = vi.fn(() => {
      if (mode === "fail") return Promise.reject(new Error("boom"));
      return new Promise<{ items: Item[]; meta: undefined }>((r) => (resolve = r));
    });

    const props = { pageSize: 10, fetchPage, getId: (item: Item) => item.id };

    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useOffsetPagination<Item>({ key, ...props }),
      { initialProps: { key: "A" } },
    );

    await waitFor(() => expect(result.current.error).not.toBeNull());

    // B(成功)を挟んでから A へ戻す。戻した瞬間は取得中で、エラーは消え骨格が出る
    mode = "pending";
    rerender({ key: "B" });
    await waitFor(() => expect(result.current.isLoading).toBe(true));
    resolve({ items: [{ id: "b" }], meta: undefined });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    rerender({ key: "A" });
    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(result.current.error).toBeNull();
  });
});
