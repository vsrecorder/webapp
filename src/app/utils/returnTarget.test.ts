// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { saveReturnAnchorTop, scrollBackToAnchor } from "@app/utils/returnTarget";

function place(id: string, top: number, parent: HTMLElement = document.body) {
  const el = document.createElement("div");
  el.id = id;
  el.getBoundingClientRect = () => ({ top, width: 100 }) as DOMRect;
  parent.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = "";
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe("saveReturnAnchorTop / scrollBackToAnchor", () => {
  it("モーダルの中の一覧は、そのスクロール領域を差のぶんだけ動かす", () => {
    const before = place("card", 300);
    saveReturnAnchorTop("card");
    before.remove();

    const container = document.createElement("div");
    container.scrollTop = 200;
    container.scrollTo = vi.fn() as unknown as typeof container.scrollTo;
    document.body.appendChild(container);
    place("card", 500, container);

    expect(scrollBackToAnchor("card", 56, { container })).toBe(true);
    expect(container.scrollTo).toHaveBeenCalledWith({ top: 400, behavior: "auto" });
  });

  it("2回呼んでも同じ位置(一覧とカードの両方から呼ばれても既定位置で上書きしない)", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    const before = place("card", 300);
    saveReturnAnchorTop("card");
    before.remove();
    place("card", 900);

    scrollBackToAnchor("card", 80);
    scrollBackToAnchor("card", 80);

    expect(scrollTo).toHaveBeenNthCalledWith(1, { top: 600, behavior: "auto" });
    expect(scrollTo).toHaveBeenNthCalledWith(2, { top: 600, behavior: "auto" });
  });

  it("進むときにカードが見つからなければ前回の高さを捨て、既定の位置に合わせる", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    const before = place("card", 300);
    saveReturnAnchorTop("card");
    before.remove();
    // 次はカードが無い状態で進んだ
    saveReturnAnchorTop("card");
    place("card", 900);

    scrollBackToAnchor("card", 80);

    expect(scrollTo).toHaveBeenCalledWith({ top: 820, behavior: "auto" });
  });

  it("目印が無ければ動かさない", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);

    expect(scrollBackToAnchor("card", 80)).toBe(false);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
