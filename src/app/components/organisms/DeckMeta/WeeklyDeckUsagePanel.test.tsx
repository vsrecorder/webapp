// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import WeeklyDeckUsagePanel from "@app/components/organisms/DeckMeta/WeeklyDeckUsagePanel";

import { WeeklyDeckUsageItemType } from "@app/types/weekly_deck_usage_stat";

// jsdom は ResizeObserver を持たない。HeroUI の Tabs が下線の位置を追うのに使う
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

// 集計行1件。fingerprint は集計側と同じ「昇順・カンマ区切り」で作る
const row = (
  spriteIds: string[],
  count: number,
  members?: WeeklyDeckUsageItemType[],
): WeeklyDeckUsageItemType => ({
  fingerprint: [...spriteIds].sort().join(","),
  count,
  usage_rate: count / 100,
  wins: count,
  losses: 0,
  win_rate: 0.5,
  pokemon_sprites: spriteIds.map((id, i) => ({ id, position: i + 1 })),
  ...(members ? { members } : {}),
});

// 「その他」行(指紋は空文字)。内訳は1体目でまとめた変種で、それぞれが組み合わせの内訳を持つ
const other: WeeklyDeckUsageItemType = {
  ...row([], 4),
  fingerprint: "",
  pokemon_sprites: [],
  members: [
    { ...row(["0025"], 2), members: [row(["0025", "0157"], 2)] },
    { ...row(["0133"], 2), members: [row(["0133", "0196"], 2)] },
  ],
};

const FIRST_SPRITE = {
  week: "2026-09-08",
  week_start: "2026-09-07",
  week_end: "2026-09-13",
  grouping: "first_sprite",
  total_votes: 100,
  contributor_count: 42,
  decks: [row(["0006"], 36, [row(["0006", "0018"], 24)]), other],
};

function stubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(FIRST_SPRITE)),
  );
}

afterEach(() => {
  // vitest は globals: false のため、testing-library の自動 cleanup が働かない。
  // 前のテストで開いたままの内訳が次のテストの検索に混ざるので明示的に片付ける。
  cleanup();
  vi.unstubAllGlobals();
});

describe("WeeklyDeckUsagePanel", () => {
  // 組み合わせ単位だと派生に票が割れるため、初期表示は1体目でまとめた集計にする
  it("既定は「1体目でまとめる」で、タブも先頭に置く", async () => {
    stubFetch();
    render(<WeeklyDeckUsagePanel />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const url = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(url).toContain("grouping=first_sprite");

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0].textContent).toBe("1体目でまとめる");
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[1].textContent).toBe("組み合わせ別");
  });

  // 「その他」に落ちた行は1体目しか出ていないため、何と組んだデッキだったのかは
  // 内訳の中をさらに開かないと分からない。
  it("「その他」の内訳から組み合わせまで開ける", async () => {
    stubFetch();
    render(<WeeklyDeckUsagePanel />);

    // 「その他」の内訳を開くまでは、集約された変種(0025)は出ていない
    const openOther = await screen.findByRole("button", { name: /内訳をすべて見る/ });
    expect(screen.queryByAltText("25")).toBeNull();

    fireEvent.click(openOther);
    const aggregated = await screen.findByAltText("25");

    // この時点では1体目(0025)だけ。組み合わせの相手(0157)はまだ出ていない
    expect(screen.queryByAltText("157")).toBeNull();

    // 内訳の行そのものを押すと、その下に組み合わせが開く
    const memberRow = aggregated.closest('[role="button"]');
    expect(memberRow).not.toBeNull();
    fireEvent.click(memberRow!);

    await waitFor(() => expect(screen.getByAltText("157")).toBeTruthy());

    // 開いた行だけが開く(もう一方の内訳は畳まれたまま)
    expect(screen.queryByAltText("196")).toBeNull();

    // もう一度押すと畳まれる
    fireEvent.click(memberRow!);
    await waitFor(() => expect(screen.queryByAltText("157")).toBeNull());
  });

  // 組み合わせ一致の集計では内訳がこれ以上無いため、押せる行にしない
  it("組み合わせの内訳を持たない行は押せる行にしない", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          ...FIRST_SPRITE,
          grouping: "exact",
          decks: [
            row(["0006", "0018"], 36),
            { ...other, members: [row(["0025", "0157"], 2), row(["0133", "0196"], 2)] },
          ],
        }),
      ),
    );
    render(<WeeklyDeckUsagePanel />);

    fireEvent.click(await screen.findByRole("button", { name: /内訳をすべて見る/ }));

    const aggregated = await screen.findByAltText("25");
    expect(aggregated.closest('[role="button"]')).toBeNull();
  });
});

describe("WeeklyDeckUsagePanel の取得失敗", () => {
  // 集計を取れなかっただけなのに「まだありません」と出すと、
  // その週は誰も投稿していないと読めてしまう。
  it("失敗を「データはまだありません」と区別して表示する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response('{"message":"error"}', { status: 500 })),
    );
    render(<WeeklyDeckUsagePanel />);

    await waitFor(() =>
      expect(screen.getByText("週間デッキ使用率を取得できませんでした")).toBeTruthy(),
    );
    expect(screen.queryByText(/公開可能なデータはまだありません/)).toBeNull();
  });

  it("「再読み込み」で取り直せる", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        return calls === 1
          ? new Response('{"message":"error"}', { status: 500 })
          : Response.json(FIRST_SPRITE);
      }),
    );
    render(<WeeklyDeckUsagePanel />);

    await waitFor(() =>
      expect(screen.getByText("週間デッキ使用率を取得できませんでした")).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: /再読み込み/ }));

    await waitFor(() =>
      expect(screen.queryByText("週間デッキ使用率を取得できませんでした")).toBeNull(),
    );
  });
});
