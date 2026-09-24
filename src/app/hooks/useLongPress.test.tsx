// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LONG_PRESS_DELAY_MS,
  LONG_PRESS_MOVE_TOLERANCE_PX,
  useLongPress,
} from "@app/hooks/useLongPress";

function Probe({
  onLongPress,
  onTap,
  enabled = true,
}: {
  onLongPress: () => void;
  onTap: () => void;
  enabled?: boolean;
}) {
  const { handlers, consumeLongPress } = useLongPress(onLongPress, { enabled });
  return (
    <div data-testid="wrap" {...handlers}>
      <button
        // 中の Button が pointerdown を止めても、包み要素の捕捉フェーズで拾えること
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => {
          if (consumeLongPress()) return;
          onTap();
        }}
      >
        押す
      </button>
    </div>
  );
}

const down = (el: Element, x = 0, y = 0) =>
  fireEvent.pointerDown(el, { pointerType: "touch", clientX: x, clientY: y });

describe("useLongPress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("押し続けると長押しが成立し、離したあとのタップは捨てる", () => {
    const onLongPress = vi.fn();
    const onTap = vi.fn();
    render(<Probe onLongPress={onLongPress} onTap={onTap} />);
    const button = screen.getByRole("button");

    down(button);
    vi.advanceTimersByTime(LONG_PRESS_DELAY_MS);
    fireEvent.pointerUp(button, { pointerType: "touch" });
    fireEvent.click(button);

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onTap).not.toHaveBeenCalled();

    // 次の普通のタップは通る
    down(button);
    fireEvent.pointerUp(button, { pointerType: "touch" });
    fireEvent.click(button);
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("規定時間より前に離せば普通のタップ", () => {
    const onLongPress = vi.fn();
    const onTap = vi.fn();
    render(<Probe onLongPress={onLongPress} onTap={onTap} />);
    const button = screen.getByRole("button");

    down(button);
    vi.advanceTimersByTime(LONG_PRESS_DELAY_MS - 1);
    fireEvent.pointerUp(button, { pointerType: "touch" });
    vi.advanceTimersByTime(LONG_PRESS_DELAY_MS);
    fireEvent.click(button);

    expect(onLongPress).not.toHaveBeenCalled();
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("指が大きく動いたら(スクロール)取り消す。小さなぶれは許す", () => {
    const onLongPress = vi.fn();
    render(<Probe onLongPress={onLongPress} onTap={vi.fn()} />);
    const button = screen.getByRole("button");

    down(button, 0, 0);
    fireEvent.pointerMove(button, { clientX: 0, clientY: LONG_PRESS_MOVE_TOLERANCE_PX });
    vi.advanceTimersByTime(LONG_PRESS_DELAY_MS);
    expect(onLongPress).toHaveBeenCalledTimes(1);

    down(button, 0, 0);
    fireEvent.pointerMove(button, {
      clientX: 0,
      clientY: LONG_PRESS_MOVE_TOLERANCE_PX + 1,
    });
    vi.advanceTimersByTime(LONG_PRESS_DELAY_MS);
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("pointercancel(ブラウザがスクロールを始めた)で取り消す", () => {
    const onLongPress = vi.fn();
    render(<Probe onLongPress={onLongPress} onTap={vi.fn()} />);
    const button = screen.getByRole("button");

    down(button);
    fireEvent.pointerCancel(button, { pointerType: "touch" });
    vi.advanceTimersByTime(LONG_PRESS_DELAY_MS);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("無効のときは長押しを検知せず、コンテキストメニューも止めない", () => {
    const onLongPress = vi.fn();
    render(<Probe onLongPress={onLongPress} onTap={vi.fn()} enabled={false} />);
    const button = screen.getByRole("button");

    down(button);
    vi.advanceTimersByTime(LONG_PRESS_DELAY_MS);
    expect(onLongPress).not.toHaveBeenCalled();

    expect(fireEvent.contextMenu(screen.getByTestId("wrap"))).toBe(true);
  });

  it("有効なときはコンテキストメニューを止める", () => {
    render(<Probe onLongPress={vi.fn()} onTap={vi.fn()} />);
    expect(fireEvent.contextMenu(screen.getByTestId("wrap"))).toBe(false);
  });
});
