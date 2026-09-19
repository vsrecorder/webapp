// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";

import DeckOpponentAnalysisPanel from "@app/components/organisms/Deck/DeckOpponentAnalysisPanel";

// jsdom の canvas は getContext を持たず、chart.js はチャートを作れずに落ちる
vi.mock("react-chartjs-2", () => ({
  Pie: () => null,
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "u1" } } }),
}));

// jsdom は ResizeObserver を持たない。HeroUI の Tabs が下線の位置を追うのに使う
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const STAT = {
  user_id: "u1",
  year_month: "2026-09",
  environment_id: "env1",
  season: "",
  regulation_id: "1",
  total_matches: 10,
  decks: [
    {
      deck_info: "相手のデッキ",
      count: 10,
      usage_rate: 1,
      wins: 6,
      losses: 4,
      win_rate: 0.6,
      pokemon_sprites: [],
    },
  ],
};

/*
 * 対戦相手の集計だけ成否を制御する fetch スタブ。
 * 選択肢に使う一覧(環境・レギュレーション・シーズン)は常に空で返す。
 */
function stubFetch(statResponses: (typeof STAT | null)[]) {
  let call = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("/opponent-deck-usage")) {
        const body = statResponses[Math.min(call, statResponses.length - 1)];
        call += 1;
        return body
          ? Response.json(body)
          : new Response('{"message":"error"}', { status: 500 });
      }
      if (url.includes("/oldest-record-event-date")) {
        return new Response("{}", { status: 404 });
      }
      return Response.json([]);
    }),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DeckOpponentAnalysisPanel の取得失敗", () => {
  it("失敗を「記録がまだありません」と区別して表示する", async () => {
    stubFetch([null]);
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <DeckOpponentAnalysisPanel deckId="deck1" />
      </SWRConfig>,
    );

    await waitFor(() =>
      expect(
        screen.getByText("対戦相手のデッキ分析を取得できませんでした"),
      ).toBeTruthy(),
    );
    expect(screen.queryByText(/対戦記録がまだありません/)).toBeNull();
  });

  it("「再読み込み」で取り直せる", async () => {
    stubFetch([null, STAT]);
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <DeckOpponentAnalysisPanel deckId="deck1" />
      </SWRConfig>,
    );

    await waitFor(() =>
      expect(
        screen.getByText("対戦相手のデッキ分析を取得できませんでした"),
      ).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: /再読み込み/ }));

    await waitFor(() => expect(screen.getByText("相手のデッキ")).toBeTruthy());
  });
});
