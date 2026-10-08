// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { deckAnchorId, markDeckModalReopen, scrollToDeckCard } from "@app/utils/deckModalReopen";

// 目印のカードを置く。width 0 は隠れているタブ側のカード
function placeCard(deckId: string, top: number, width: number) {
  const el = document.createElement("div");
  el.id = deckAnchorId(deckId);
  el.getBoundingClientRect = () => ({ top, width }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = "";
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe("scrollToDeckCard", () => {
  it("離れる直前にカードがあった画面上の高さへ戻す(元の位置)", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    // 画面の途中(上端から 420px)にあったカードからデッキモーダル経由で別ページへ
    const before = placeCard("d1", 420, 390);
    markDeckModalReopen("d1", false);
    before.remove();

    // 戻ってきた一覧では、カードは文書の上端から 1300px(スクロール 0)
    vi.stubGlobal("scrollY", 0);
    placeCard("d1", 1300, 390);
    scrollToDeckCard("d1");

    expect(scrollTo).toHaveBeenCalledWith({ top: 880, behavior: "auto" });
  });

  it("見えている方のカードが固定バーに隠れない位置まで移動する", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    vi.stubGlobal("scrollY", 300);
    placeCard("d1", 0, 0);
    placeCard("d1", 700, 390);

    scrollToDeckCard("d1");

    expect(scrollTo).toHaveBeenCalledWith({ top: 900, behavior: "auto" });
  });

  it("先頭付近のカードでは負の位置へ行かない", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    placeCard("d1", 40, 390);

    scrollToDeckCard("d1");

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
  });

  it("カードが無ければ動かさない", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);

    scrollToDeckCard("d1");

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
