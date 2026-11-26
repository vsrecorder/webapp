// @vitest-environment jsdom
import { renderToString } from "react-dom/server";

import { act, cleanup, render, screen } from "@testing-library/react";
import { today } from "@internationalized/date";
import { afterEach, describe, expect, it } from "vitest";

import HydratedDatePicker from "@app/components/molecules/HydratedDatePicker";

afterEach(cleanup);

// カレンダーの位置決め(react-aria の useOverlayPosition)が使う。jsdom には無い
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

/*
 * react-aria の DateSegment は iOS でだけ role="textbox"、他では role="spinbutton" になる。
 * サーバがセグメントを描くと iOS では必ずハイドレーションが食い違うため、
 * サーバ側では実体を描かないことを固定する。
 */
// カレンダーを開くボタン(名前はロケールで変わるので data-slot で探す)
function openCalendar(container: HTMLElement) {
  const button = container.querySelector<HTMLButtonElement>('[data-slot="selector-button"]');
  if (!button) throw new Error("カレンダーを開くボタンが無い");
  act(() => {
    button.click();
  });
}

describe("HydratedDatePicker", () => {
  const value = today("Asia/Tokyo");

  it("サーバ描画では日付セグメントを出さない", () => {
    const html = renderToString(
      <HydratedDatePicker aria-label="開催日" size="sm" value={value} />,
    );

    expect(html).not.toContain("spinbutton");
    expect(html).not.toContain("textbox");
  });

  it("サーバ描画でも実体と同じ高さの箱を置く(レイアウトを動かさない)", () => {
    const html = renderToString(
      <HydratedDatePicker aria-label="開催日" size="sm" value={value} />,
    );

    // 骨格(EventDateSkeleton)と同じ h-8
    expect(html).toContain("h-8");
  });

  /*
   * カレンダーを開いている間は背景が読み上げの対象から外れる(= モーダルとして開く)。
   * 非モーダル(HeroUI の既定)に戻ると、外側のタップが閉じると同時に下の要素へ届く。
   * すり抜けそのものは jsdom では再現できないので、モーダルで開いていることで固定する。
   */
  it("カレンダーはモーダルとして開き、背景を読み上げの対象から外す", async () => {
    const { container } = render(
      <div>
        <button type="button">背景のボタン</button>
        <HydratedDatePicker aria-label="開催日" size="sm" value={value} />
      </div>,
    );

    openCalendar(container);

    expect(await screen.findByRole("grid")).toBeTruthy();
    expect(screen.getByText("背景のボタン").closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it("呼び出し側の popoverProps で上書きできる", async () => {
    const { container } = render(
      <div>
        <button type="button">背景のボタン</button>
        <HydratedDatePicker
          aria-label="開催日"
          size="sm"
          value={value}
          popoverProps={{ isNonModal: true }}
        />
      </div>,
    );

    openCalendar(container);

    expect(await screen.findByRole("grid")).toBeTruthy();
    expect(screen.getByText("背景のボタン").closest('[aria-hidden="true"]')).toBeNull();
  });

  it("ハイドレーション後は DatePicker の実体を描く", () => {
    render(<HydratedDatePicker aria-label="開催日" size="sm" value={value} />);

    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);
  });
});
