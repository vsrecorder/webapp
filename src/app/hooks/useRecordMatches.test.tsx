// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useRecordMatches } from "@app/hooks/useRecordMatches";

import { MatchGetResponseType } from "@app/types/match";

const match = (id: string) => ({ id }) as unknown as MatchGetResponseType;

// 取得は utils/matchStats の fetchMatchesByRecordId 経由。fetch を差し替えて応答を作る
function mockFetch(responses: Array<MatchGetResponseType[] | "error">) {
  let call = 0;
  return vi.fn(async () => {
    const response = responses[Math.min(call, responses.length - 1)];
    call++;
    if (response === "error") return { ok: false, status: 500 } as Response;
    return { ok: true, json: async () => response } as Response;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useRecordMatches", () => {
  it("取得できたら対戦一覧を返す", async () => {
    vi.stubGlobal("fetch", mockFetch([[match("m1")]]));
    const { result } = renderHook(() => useRecordMatches("r1"));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.matches).toEqual([match("m1")]);
    expect(result.current.failed).toBe(false);
  });

  it("失敗しても空配列にはしない(0件と混ぜない)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", mockFetch(["error"]));
    const { result } = renderHook(() => useRecordMatches("r1"));

    await waitFor(() => expect(result.current.failed).toBe(true));

    // ここで [] を返すと「対戦結果がありません」と表示されてしまう
    expect(result.current.matches).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("取り直し中もエラーのままにする(エラー→骨格→エラーと往復させない)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", mockFetch(["error", [match("m1")]]));
    const { result } = renderHook(() => useRecordMatches("r1"));

    await waitFor(() => expect(result.current.failed).toBe(true));

    act(() => result.current.retry());
    // 取り直しの間は failed のまま(ボタンだけ回す)
    expect(result.current.failed).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.isRetrying).toBe(true);

    await waitFor(() => expect(result.current.matches).toEqual([match("m1")]));
    expect(result.current.failed).toBe(false);
    expect(result.current.isRetrying).toBe(false);
  });

  it("記録が差し替わったら、前の記録の一覧・失敗を持ち越さない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", mockFetch(["error", [match("m2")]]));
    const { result, rerender } = renderHook(({ id }) => useRecordMatches(id), {
      initialProps: { id: "r1" },
    });

    await waitFor(() => expect(result.current.failed).toBe(true));

    rerender({ id: "r2" });
    // 差し替わった描画では、前の記録の失敗を出したままにしない
    expect(result.current.failed).toBe(false);
    expect(result.current.matches).toBeNull();
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.matches).toEqual([match("m2")]));
  });
});
