// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useModalDragToClose } from "@app/hooks/useModalDragToClose";

// HeroUI の Modal と同じ入れ子(role="dialog" の中にヘッダー)を最小構成で組み、
// フックの戻り値(ref コールバック)をヘッダーへ渡す
function mount(options?: Parameters<typeof useModalDragToClose>[1]) {
  const onClose = vi.fn();
  const { result, unmount } = renderHook(() => useModalDragToClose(onClose, options));

  const dialog = document.createElement("div");
  dialog.setAttribute("role", "dialog");
  const header = document.createElement("header");
  const button = document.createElement("button");
  button.textContent = "ボタン";
  header.append(button);
  dialog.append(header);
  document.body.append(dialog);

  act(() => {
    result.current(header);
  });

  return {
    onClose,
    header,
    button,
    // React がヘッダーを unmount したときと同じく ref に null を渡す
    detach: () => {
      act(() => {
        result.current(null);
      });
    },
    cleanup: () => {
      act(() => {
        result.current(null);
      });
      unmount();
      dialog.remove();
    },
  };
}

// マウスのポインタイベント(jsdom は PointerEvent を持つ。setPointerCapture は無い)
function pointer(target: Element, type: string, init: PointerEventInit = {}) {
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

describe("useModalDragToClose (マウス)", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("ヘッダーをマウスで閾値より下へ引くと 1 回だけ閉じる", () => {
    const m = mount();
    cleanup = m.cleanup;

    pointer(m.header, "pointerdown", { clientY: 100 });
    pointer(m.header, "pointermove", { clientY: 120 });
    expect(m.onClose).not.toHaveBeenCalled();

    pointer(m.header, "pointermove", { clientY: 140 });
    expect(m.onClose).toHaveBeenCalledTimes(1);

    // 閉じた後の続きの移動では再び閉じない
    pointer(m.header, "pointermove", { clientY: 200 });
    pointer(m.header, "pointerup", { clientY: 200 });
    expect(m.onClose).toHaveBeenCalledTimes(1);
  });

  it("押し始めでは文字列選択が始まらないよう既定動作を止める", () => {
    const m = mount();
    cleanup = m.cleanup;

    expect(pointer(m.header, "pointerdown", { clientY: 100 }).defaultPrevented).toBe(true);
  });

  it("閾値に届かずに離すと閉じず、その後の移動でも閉じない", () => {
    const m = mount();
    cleanup = m.cleanup;

    pointer(m.header, "pointerdown", { clientY: 100 });
    pointer(m.header, "pointermove", { clientY: 120 });
    pointer(m.header, "pointerup", { clientY: 120 });
    pointer(m.header, "pointermove", { clientY: 300 });
    expect(m.onClose).not.toHaveBeenCalled();
  });

  it("上へ引いても閉じない", () => {
    const m = mount();
    cleanup = m.cleanup;

    pointer(m.header, "pointerdown", { clientY: 100 });
    pointer(m.header, "pointermove", { clientY: 20 });
    expect(m.onClose).not.toHaveBeenCalled();
  });

  it("タッチ由来のポインタイベントは扱わない(touch イベント側に任せる)", () => {
    const m = mount();
    cleanup = m.cleanup;

    const down = pointer(m.header, "pointerdown", { pointerType: "touch", clientY: 100 });
    pointer(m.header, "pointermove", { pointerType: "touch", clientY: 200 });
    expect(down.defaultPrevented).toBe(false);
    expect(m.onClose).not.toHaveBeenCalled();
  });

  it("ペンも扱わない(iPad 等では touch イベントも発火し、二重に閉じてしまうため)", () => {
    const m = mount();
    cleanup = m.cleanup;

    const down = pointer(m.header, "pointerdown", { pointerType: "pen", clientY: 100 });
    pointer(m.header, "pointermove", { pointerType: "pen", clientY: 200 });
    expect(down.defaultPrevented).toBe(false);
    expect(m.onClose).not.toHaveBeenCalled();
  });

  it("ヘッダー内のボタンから始めた操作はドラッグにしない", () => {
    const m = mount();
    cleanup = m.cleanup;

    const down = pointer(m.button, "pointerdown", { clientY: 100 });
    pointer(m.button, "pointermove", { clientY: 200 });
    expect(down.defaultPrevented).toBe(false);
    expect(m.onClose).not.toHaveBeenCalled();
  });

  it("主ボタン以外(右クリック等)では始まらない", () => {
    const m = mount();
    cleanup = m.cleanup;

    pointer(m.header, "pointerdown", { button: 2, clientY: 100 });
    pointer(m.header, "pointermove", { clientY: 200 });
    expect(m.onClose).not.toHaveBeenCalled();
  });

  it("disabled の間は閉じない", () => {
    const m = mount({ disabled: true });
    cleanup = m.cleanup;

    pointer(m.header, "pointerdown", { clientY: 100 });
    pointer(m.header, "pointermove", { clientY: 200 });
    expect(m.onClose).not.toHaveBeenCalled();
  });

  it("ref を外すとリスナも外れる", () => {
    const m = mount();
    cleanup = m.cleanup;

    m.detach();

    pointer(m.header, "pointerdown", { clientY: 100 });
    pointer(m.header, "pointermove", { clientY: 200 });
    expect(m.onClose).not.toHaveBeenCalled();
  });
});
