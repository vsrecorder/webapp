// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import UserStatHistoryChart from "@app/components/organisms/UserStat/UserStatHistoryChart";

// jsdom の canvas は getContext を持たず、chart.js はチャートを作れずに落ちる
vi.mock("react-chartjs-2", () => ({
  Line: () => null,
}));

// jsdom は ResizeObserver を持たない。HeroUI の Tabs が下線の位置を追うのに使う
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const HISTORY = {
  user_id: "u1",
  period: "3months",
  points: [
    { date: "2026-07-01", win_rate: 0.5, wins: 5, losses: 5, game_count: 10 },
    { date: "2026-08-01", win_rate: 0.6, wins: 6, losses: 4, game_count: 10 },
  ],
};

/* 勝率推移の取得だけ成否を制御する。デッキ一覧など選択肢用の取得は空で返す */
function stubFetch(responses: (typeof HISTORY | null)[]) {
  let call = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("/stat/history")) {
        const body = responses[Math.min(call, responses.length - 1)];
        call += 1;
        return body
          ? Response.json(body)
          : new Response('{"message":"error"}', { status: 500 });
      }
      return Response.json({ decks: [] });
    }),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("UserStatHistoryChart の取得失敗", () => {
  it("失敗を「データがありません」と区別して表示する", async () => {
    stubFetch([null]);
    render(<UserStatHistoryChart userId="u1" championshipSeries={[]} />);

    await waitFor(() =>
      expect(screen.getByText("勝率の推移を取得できませんでした")).toBeTruthy(),
    );
    // 記録が無いわけではないので、データなしの文言は出さない
    expect(screen.queryByText("データがありません")).toBeNull();
  });

  it("「再読み込み」で取り直せる", async () => {
    stubFetch([null, HISTORY]);
    render(<UserStatHistoryChart userId="u1" championshipSeries={[]} />);

    await waitFor(() =>
      expect(screen.getByText("勝率の推移を取得できませんでした")).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: /再読み込み/ }));

    await waitFor(() =>
      expect(screen.queryByText("勝率の推移を取得できませんでした")).toBeNull(),
    );
  });
});
