// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";

import OpponentDeckUsagePanel from "@app/components/organisms/DeckUsage/OpponentDeckUsagePanel";

import { EnvironmentType } from "@app/types/environment";

// jsdom の canvas は getContext を持たず、chart.js はチャートを作れずに落ちる
vi.mock("react-chartjs-2", () => ({
  Pie: () => null,
}));

// jsdom は ResizeObserver を持たない。HeroUI の Tabs が下線の位置を追うのに使う
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const ENVIRONMENTS: EnvironmentType[] = [
  {
    id: "env1",
    title: "環境A",
    from_date: new Date("2026-01-01"),
    to_date: new Date("2026-06-30"),
  },
];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("OpponentDeckUsagePanel の取得失敗", () => {
  it("失敗を「記録がまだありません」と区別して表示する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/opponent-deck-usage")) {
          return new Response('{"message":"error"}', { status: 500 });
        }
        // 自分のデッキ一覧・最も古い記録日など、本筋でない取得は空で返す
        return new Response("{}", { status: 404 });
      }),
    );

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <OpponentDeckUsagePanel
          userId="u1"
          environments={ENVIRONMENTS}
          currentEnvironmentId="env1"
          standardRegulations={[]}
          championshipSeries={[]}
          sectionTitle="対戦相手のデッキ分析"
        />
      </SWRConfig>,
    );

    await waitFor(() =>
      expect(
        screen.getByText("対戦相手のデッキ分析を取得できませんでした"),
      ).toBeTruthy(),
    );
    expect(screen.queryByText(/対戦記録がまだありません/)).toBeNull();
    // 中身が無い状態でシェア画像を作らせない
    expect(screen.getByRole("button", { name: /シェア/ }).hasAttribute("disabled")).toBe(
      true,
    );
  });
});
