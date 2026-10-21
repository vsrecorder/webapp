// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OpponentDeckDistributionChart from "@app/components/organisms/DeckUsage/OpponentDeckDistributionChart";

// jsdom の canvas は getContext を持たず、chart.js はチャートを作れずに落ちる。
// 円グラフ本体が作られたかどうかだけを見る
vi.mock("react-chartjs-2", () => ({
  Pie: () => <canvas data-testid="pie" />,
}));

const DECKS = [
  {
    deck_info: "相手のデッキ",
    count: 10,
    usage_rate: 1,
    wins: 6,
    losses: 4,
    win_rate: 0.6,
    pokemon_sprites: [],
  },
];

let frameCallbacks: FrameRequestCallback[] = [];

function runFrame() {
  const callbacks = frameCallbacks;
  frameCallbacks = [];
  act(() => callbacks.forEach((cb) => cb(performance.now())));
}

beforeEach(() => {
  frameCallbacks = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frameCallbacks.push(cb);
    return frameCallbacks.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("OpponentDeckDistributionChart の円グラフ本体のマウント", () => {
  it("モーダル(入場アニメの再生あり)では、凡例を描いたフレームの次に円グラフを作る", () => {
    render(
      <OpponentDeckDistributionChart
        decks={DECKS}
        isLoading={false}
        hasData
        emptyMessage=""
        replayEntryAnimation
      />,
    );

    // 凡例と chart.js の初期化を同じタスクに重ねない
    expect(screen.getByText("相手のデッキ")).toBeTruthy();
    expect(screen.queryByTestId("pie")).toBeNull();

    runFrame();
    expect(screen.queryByTestId("pie")).toBeNull();

    runFrame();
    expect(screen.queryByTestId("pie")).not.toBeNull();
  });

  it("ページ内ではすぐに円グラフを作る", () => {
    render(
      <OpponentDeckDistributionChart decks={DECKS} isLoading={false} hasData emptyMessage="" />,
    );

    expect(screen.queryByTestId("pie")).not.toBeNull();
  });
});
