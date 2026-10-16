// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import type { MouseEvent, TouchEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isTapDuringScroll,
  SCROLL_ACTIVE_MS,
  TAP_MAX_DURATION_MS,
  TAP_SLOP_PX,
  useTapDuringScroll,
} from "./useTapDuringScroll";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("isTapDuringScroll", () => {
  const gesture = { startX: 100, startY: 100, startedAt: 1000, lastScrollAt: 950 };

  it("スクロール中に始まり、動かず短く離したタッチはタップとみなす", () => {
    expect(isTapDuringScroll(gesture, { x: 102, y: 98, at: 1100 })).toBe(true);
  });

  it("スクロールしていなければ扱わない(click に任せる)", () => {
    expect(isTapDuringScroll({ ...gesture, lastScrollAt: null }, { x: 100, y: 100, at: 1100 })).toBe(
      false,
    );
    expect(
      isTapDuringScroll(
        { ...gesture, lastScrollAt: 1000 - SCROLL_ACTIVE_MS - 1 },
        { x: 100, y: 100, at: 1100 },
      ),
    ).toBe(false);
  });

  it("指が動いたものはスクロールの操作として扱わない", () => {
    expect(isTapDuringScroll(gesture, { x: 100, y: 100 + TAP_SLOP_PX, at: 1100 })).toBe(false);
    expect(isTapDuringScroll(gesture, { x: 100 - TAP_SLOP_PX, y: 100, at: 1100 })).toBe(false);
  });

  it("長押しは扱わない", () => {
    expect(isTapDuringScroll(gesture, { x: 100, y: 100, at: 1000 + TAP_MAX_DURATION_MS + 1 })).toBe(
      false,
    );
  });
});

describe("useTapDuringScroll", () => {
  let now = 0;

  function setup() {
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const onTap = vi.fn();
    const { result } = renderHook(() => useTapDuringScroll(onTap));
    return { onTap, handlers: () => result.current.handlersFor("/decks") };
  }

  function touch(x: number, y: number) {
    return { clientX: x, clientY: y };
  }

  function tap(handlers: ReturnType<ReturnType<typeof setup>["handlers"]>, at: number) {
    now = at;
    handlers.onTouchStart({ touches: [touch(10, 10)] } as unknown as TouchEvent);
    now = at + 80;
    handlers.onTouchEnd({ changedTouches: [touch(11, 10)] } as unknown as TouchEvent);
  }

  function click(handlers: ReturnType<ReturnType<typeof setup>["handlers"]>) {
    const e = { preventDefault: vi.fn() };
    handlers.onClick(e as unknown as MouseEvent);
    return e.preventDefault;
  }

  function scrollAt(at: number) {
    now = at;
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
  }

  it("スクロール中のタップは touchend で遷移させ、続く click は打ち消す", () => {
    const { onTap, handlers } = setup();

    scrollAt(1000);
    tap(handlers(), 1050);
    expect(onTap).toHaveBeenCalledWith("/decks");

    // スクロールの止め際で click が出た場合は、Link に二重に遷移させない
    expect(click(handlers())).toHaveBeenCalled();
  });

  it("スクロールしていないときのタップは click に任せる", () => {
    const { onTap, handlers } = setup();

    tap(handlers(), 1000);
    expect(onTap).not.toHaveBeenCalled();
    expect(click(handlers())).not.toHaveBeenCalled();
  });

  it("ブラウザが click を出さなかったとき、次の普通のタップの click は打ち消さない", () => {
    const { onTap, handlers } = setup();

    scrollAt(1000);
    tap(handlers(), 1050);
    expect(onTap).toHaveBeenCalledTimes(1);

    // click が来ないまま、スクロールが止まった後に別のタップ
    tap(handlers(), 1600);
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(click(handlers())).not.toHaveBeenCalled();
  });
});
