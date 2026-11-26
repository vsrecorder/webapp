// @vitest-environment jsdom
import { renderToString } from "react-dom/server";

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { today } from "@internationalized/date";
import { afterEach, describe, expect, it, vi } from "vitest";

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
// 外側のタップを受け止める層
const shield = () => document.querySelector<HTMLElement>('[data-slot="outside-tap-shield"]');

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

  /*
   * 外側のタップは、カレンダーのすぐ下に置いた透明な層(OutsideTapShield)で受け止める。
   * モーダルとして開くだけでは、指を離すのが遅いタップの click が下の要素へ届く(webapp #78 は
   * それだけで、実機ではカレンダーの外のタブが切り替わった)。
   * すり抜けそのものは jsdom では再現できないので、層が出ること・層に触れるとカレンダーが
   * 閉じること・そのタップが終わるまで層が残ることで固定する。
   */
  it("開いている間は外側のタップを受け止める層を置き、閉じている間は置かない", async () => {
    const { container } = render(
      <HydratedDatePicker aria-label="開催日" size="sm" value={value} />,
    );

    expect(shield()).toBeNull();

    openCalendar(container);

    expect(await screen.findByRole("grid")).toBeTruthy();
    expect(shield()).not.toBeNull();
  });

  it("層に触れるとカレンダーが閉じ、そのタップが終わるまで層は残る", async () => {
    const { container } = render(
      <HydratedDatePicker aria-label="開催日" size="sm" value={value} />,
    );

    openCalendar(container);
    expect(await screen.findByRole("grid")).toBeTruthy();

    fireEvent.pointerDown(shield()!);

    await waitFor(() => expect(screen.queryByRole("grid")).toBeNull());
    // カレンダーが消えたあとも、click が来るまでは層がタップを受け止める
    expect(shield()).not.toBeNull();

    fireEvent.pointerUp(shield()!);
    fireEvent.click(shield()!);

    expect(shield()).toBeNull();
  });

  it("閉じたあと、もう一度開ける", async () => {
    const { container } = render(
      <HydratedDatePicker aria-label="開催日" size="sm" value={value} />,
    );

    openCalendar(container);
    expect(await screen.findByRole("grid")).toBeTruthy();

    fireEvent.pointerDown(shield()!);
    fireEvent.pointerUp(shield()!);
    fireEvent.click(shield()!);
    await waitFor(() => expect(screen.queryByRole("grid")).toBeNull());

    openCalendar(container);

    expect(await screen.findByRole("grid")).toBeTruthy();
    expect(shield()).not.toBeNull();
  });

  it("呼び出し側の popoverProps で非モーダルに戻すと、層も置かない", async () => {
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
    expect(shield()).toBeNull();
  });

  /*
   * HeroUI の <DatePicker> をそのまま使わず、公開フック(useDatePicker)で同じものを組み立てている。
   * 組み立てを取りこぼすと、日付欄やカレンダーを開くボタンが出なくなる。
   */
  it("日付欄・カレンダーを開くボタン・選んだ日付を、HeroUI の DatePicker と同じように描く", async () => {
    const { container } = render(
      <HydratedDatePicker aria-label="開催日" size="sm" value={value} name="event-date" />,
    );

    expect(screen.getAllByRole("spinbutton")).toHaveLength(3);
    expect(container.querySelector('[data-slot="selector-button"] svg')).not.toBeNull();
    expect(container.querySelector<HTMLInputElement>('input[name="event-date"]')?.value).toBe(
      value.toString(),
    );

    openCalendar(container);

    const grid = await screen.findByRole("grid");
    expect(grid.querySelector('[aria-selected="true"]')?.textContent).toBe(String(value.day));
  });

  it("カレンダーで日付を選ぶと onChange が呼ばれ、カレンダーと層が消える", async () => {
    const onChange = vi.fn();
    const first = value.set({ day: 1 });
    const { container } = render(
      <HydratedDatePicker aria-label="開催日" size="sm" value={first} onChange={onChange} />,
    );

    openCalendar(container);
    const grid = await screen.findByRole("grid");

    const target = [...grid.querySelectorAll<HTMLElement>('[role="button"]')].find(
      (el) => el.textContent === "15" && el.getAttribute("data-outside-month") !== "true",
    );
    if (!target) throw new Error("15日のセルが無い");
    act(() => {
      target.click();
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].toString()).toBe(first.set({ day: 15 }).toString());
    await waitFor(() => expect(screen.queryByRole("grid")).toBeNull());
    expect(shield()).toBeNull();
  });

  it("ハイドレーション後は DatePicker の実体を描く", () => {
    render(<HydratedDatePicker aria-label="開催日" size="sm" value={value} />);

    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);
  });
});
