// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { mutate } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useKizunaDecksState, useKizunaLevel } from "@app/hooks/useKizunaLevels";
import { refreshKizuna } from "@app/utils/kizunaClient";

import { KizunaType } from "@app/types/kizuna";

/*
 * 本番と同じく SWR の既定のキャッシュを使う(画面をまたいで1つのキャッシュを共有する形)。
 * キャッシュはテストをまたいで残るので、テストごとに別のユーザーにする。
 */

function kizuna(userId: string, level: number) {
  return { user_id: userId, decks: [{ deck_id: "d1", level }] } as unknown as KizunaType;
}

// そのユーザーのきずなを取りに行った回数
function callsFor(fetchMock: { mock: { calls: unknown[][] } }, userId: string) {
  return fetchMock.mock.calls.filter(([url]) => url === `/api/users/${userId}/kizuna`).length;
}

function ok(body: KizunaType) {
  return { ok: true, json: async () => body } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("refreshKizuna", () => {
  it("表示中のきずなLv.をその場で取り直す", async () => {
    const fetchMock = vi.fn(async () => ok(kizuna("u1", 40)));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useKizunaLevel("u1", "d1"));
    await waitFor(() => expect(result.current).toBe(40));

    // 対戦を記録した
    fetchMock.mockImplementation(async () => ok(kizuna("u1", 41)));
    act(() => refreshKizuna());

    await waitFor(() => expect(result.current).toBe(41));
  });

  it("表示していないキャッシュも差し替え、次に開いたときに古い値を出さない", async () => {
    const fetchMock = vi.fn(async () => ok(kizuna("u2", 41)));
    vi.stubGlobal("fetch", fetchMock);

    // デッキ一覧を開いてから離れる(サーバ描画の値がキャッシュに残る)
    const list = renderHook(() => useKizunaDecksState("u2", kizuna("u2", 40), true));
    expect(list.result.current.decks.get("d1")?.level).toBe(40);
    list.unmount();

    // 記録の画面で対戦を記録した
    refreshKizuna();
    await waitFor(() => expect(callsFor(fetchMock, "u2")).toBe(1));

    // デッキ詳細を開いた最初の描画から新しい値が出る
    await waitFor(() => {
      const { result, unmount } = renderHook(() => useKizunaLevel("u2", "d1"));
      const first = result.current;
      unmount();
      expect(first).toBe(41);
    });
  });

  it("取り直しに失敗したら古い値を残す", async () => {
    const fetchMock = vi.fn(async () => ok(kizuna("u3", 40)));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useKizunaLevel("u3", "d1"));
    await waitFor(() => expect(result.current).toBe(40));

    fetchMock.mockImplementation(async () => ({ ok: false, status: 502 }) as Response);
    await act(async () => {
      refreshKizuna();
      await waitFor(() => expect(callsFor(fetchMock, "u3")).toBe(2));
    });

    expect(result.current).toBe(40);
  });

  it("きずな以外のキャッシュは取り直さない", async () => {
    const fetchMock = vi.fn(async () => ok(kizuna("u4", 40)));
    vi.stubGlobal("fetch", fetchMock);

    await mutate("/api/users/u4/deck-usage?all_time=true", [], { revalidate: false });
    await mutate("/api/users/u4/kizuna/extra", [], { revalidate: false });

    refreshKizuna();

    // 既定のキャッシュには前のテストのきずなが残っているので、このユーザーの分だけ見る
    const urls = (fetchMock.mock.calls as unknown[][]).map(([url]) => String(url));
    expect(urls.filter((url) => url.includes("/u4/"))).toEqual([]);
  });
});
