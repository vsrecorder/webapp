// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useDeckUsageAllTime } from "@app/hooks/useDeckUsageStats";

import { DeckUsageStatType } from "@app/types/deck_usage_stat";

const usage = {
  decks: [{ deck_id: "d1", count: 3, wins: 2, losses: 1 }],
} as unknown as DeckUsageStatType;

// SWR のキャッシュはテスト間で共有されるので、毎回切り離す
function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useDeckUsageAllTime", () => {
  it("取得できたら deck_id ごとの戦績を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => usage }) as Response),
    );

    const { result } = renderHook(() => useDeckUsageAllTime("u1"), { wrapper });

    await waitFor(() => expect(result.current.stats.get("d1")).toBeTruthy());
    expect(result.current.failed).toBe(false);
  });

  it("失敗したら空にせず failed で伝える", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500 }) as Response),
    );

    const { result } = renderHook(() => useDeckUsageAllTime("u1"), { wrapper });

    // 空の Map のまま黙ると、デッキカードは「まだ使っていないデッキ」と同じ見た目になる
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.stats.size).toBe(0);
  });

  it("retry で取り直す", async () => {
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        call++;
        if (call === 1) return { ok: false, status: 500 } as Response;
        return { ok: true, json: async () => usage } as Response;
      }),
    );

    const { result } = renderHook(() => useDeckUsageAllTime("u1"), { wrapper });
    await waitFor(() => expect(result.current.failed).toBe(true));

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.failed).toBe(false));
    expect(result.current.stats.get("d1")).toBeTruthy();
  });

  it("サーバで取れた値があるときは、裏の取り直しが失敗しても数字を消さない", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500 }) as Response),
    );

    const { result } = renderHook(() => useDeckUsageAllTime("u1", usage), { wrapper });

    await waitFor(() => expect(result.current.stats.get("d1")).toBeTruthy());
    // 表示中の戦績は残す(消すと出ていた数字が理由なく消える)
    expect(result.current.failed).toBe(false);
  });
});
