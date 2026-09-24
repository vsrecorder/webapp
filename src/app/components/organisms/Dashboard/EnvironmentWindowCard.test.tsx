// @vitest-environment jsdom
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import EnvironmentWindowCard from "@app/components/organisms/Dashboard/EnvironmentWindowCard";

import { WeeklyDeckUsageItemType } from "@app/types/weekly_deck_usage_stat";

// jsdom は ResizeObserver を持たない。HeroUI の Tabs が下線の位置を追うのに使う
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// デッキ登録モーダル(カードが常にマウントする)が useRouter を使う
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

// 集計行1件。fingerprint は集計側と同じ「昇順・カンマ区切り」で作る
const row = (
  spriteIds: string[],
  count: number,
  winRate: number,
  members?: WeeklyDeckUsageItemType[],
): WeeklyDeckUsageItemType => ({
  fingerprint: [...spriteIds].sort().join(","),
  count,
  usage_rate: count / 100,
  wins: Math.round(count * winRate),
  losses: count - Math.round(count * winRate),
  win_rate: winRate,
  pokemon_sprites: spriteIds.map((id, i) => ({ id, position: i + 1 })),
  ...(members ? { members } : {}),
});

const EXACT = {
  week: "2026-W37",
  week_start: "2026-09-07",
  week_end: "2026-09-13",
  grouping: "exact",
  total_votes: 100,
  contributor_count: 42,
  decks: [row(["0006", "0018"], 24, 0.52), row(["0006", "0477"], 12, 0.47)],
};

// 1体目でまとめると、上の2行が「リザードン(0006)」1行に束ねられ内訳を持つ
const FIRST_SPRITE = {
  ...EXACT,
  grouping: "first_sprite",
  decks: [
    row(["0006"], 36, 0.5, [row(["0006", "0018"], 24, 0.52), row(["0006", "0477"], 12, 0.47)]),
  ],
};

function stubFetch({ failExact = false }: { failExact?: boolean } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/deck_meta/weekly_usage")) {
        const isFirstSprite = url.includes("grouping=first_sprite");
        if (!isFirstSprite && failExact) {
          return new Response("boom", { status: 500 });
        }
        return Response.json(isFirstSprite ? FIRST_SPRITE : EXACT);
      }
      if (url.includes("/api/decks/all")) {
        return Response.json([
          {
            id: "deck-1",
            user_id: "user-1",
            name: "リザードンex / ヨノワールex",
            created_at: "2026-09-01T00:00:00Z",
            pokemon_sprites: [
              { id: "0006", position: 1 },
              { id: "0477", position: 2 },
            ],
          },
        ]);
      }
      return Response.json({ decks: [] });
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/*
 * 自動 cleanup は入っていない(vitest の globals を有効にしていないため、
 * @testing-library/react が afterEach を登録できない)。前のテストの描画が
 * document に残るので、document 全体を見る screen ではなく container の中で探す。
 */
describe("EnvironmentWindowCard", () => {
  it("既定は「1体目でまとめる」で、タブも先頭に置く", async () => {
    stubFetch();

    const { container } = render(
      <EnvironmentWindowCard userId="user-1" totalRecords={3} showEmptyState />,
    );
    const card = within(container);

    await waitFor(() => expect(card.getAllByRole("tab").length).toBe(2));
    const tabs = card.getAllByRole("tab");
    expect(tabs[0].textContent).toBe("1体目でまとめる");
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[1].textContent).toBe("組み合わせ別");

    const weeklyCalls = vi
      .mocked(fetch)
      .mock.calls.map(([input]) => String(input))
      .filter((url) => url.includes("/api/deck_meta/weekly_usage"));
    expect(weeklyCalls[0]).toContain("grouping=first_sprite");
  });

  it("1体目でまとめると、束ねた組み合わせの内訳を開ける", async () => {
    stubFetch();

    const { container } = render(
      <EnvironmentWindowCard userId="user-1" totalRecords={3} showEmptyState />,
    );
    const card = within(container);

    // 既定(1体目でまとめる)では束ねた行に内訳(2種類)が付く
    const toggle = await waitFor(() => card.getByText("組み合わせの内訳を見る（2種類）"));

    // 開くまで内訳の行は出さない
    expect(card.queryByText("24件")).toBeNull();

    fireEvent.click(toggle);

    // 内訳の使用率は行と同じ基準(その他を除いた割合)。24+12件 = 束ねた行の36件
    expect(card.getByText("24件")).toBeTruthy();
    expect(card.getByText("12件")).toBeTruthy();
    expect(card.getByText("内訳を閉じる")).toBeTruthy();

    // 束ねた行のどれが自分のデッキ(0006 + 0477)かを内訳にも示す
    expect(card.getByText("あなた")).toBeTruthy();
  });

  it("まとめ方の切り替えに失敗してもカードは残り、やり直せる", async () => {
    stubFetch({ failExact: true });
    // 失敗そのものは想定内なので、テスト出力に出さない
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { container } = render(
      <EnvironmentWindowCard userId="user-1" totalRecords={3} showEmptyState />,
    );
    const card = within(container);

    await waitFor(() => expect(card.getByText("組み合わせ別")).toBeTruthy());

    fireEvent.click(card.getByText("組み合わせ別"));

    // カードごと消すとタブまで消えて元のまとめ方にも戻せなくなる。前の結果を残して知らせる
    await waitFor(() =>
      expect(card.getByText(/まとめ方を切り替えられませんでした/)).toBeTruthy(),
    );
    expect(card.getByText("1体目でまとめる")).toBeTruthy();

    // 元のまとめ方に戻せば、取得が通って注記も戻る
    fireEvent.click(card.getByText("1体目でまとめる"));
    await waitFor(() =>
      expect(card.getByText(/1体目のポケモンが同じもの/)).toBeTruthy(),
    );
    expect(card.queryByText(/まとめ方を切り替えられませんでした/)).toBeNull();

    errorSpy.mockRestore();
  });
});
