// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { revealAfterKeyboard } from "@app/utils/keyboard";

/*
 * jsdom はレイアウトを持たないので、スクロール領域・入力欄・ボタン行の位置を手で与える。
 * 位置はスクロール量に連動させる(送ったぶんだけ中身が上へ動く)。
 */
function setup({
  boxBottom,
  inputTop,
  actionsBottom,
}: {
  boxBottom: number;
  inputTop: number;
  actionsBottom: number;
}) {
  const container = document.createElement("div");
  container.style.overflowY = "auto";
  const input = document.createElement("input");
  const actions = document.createElement("div");
  container.append(input, actions);
  document.body.append(container);

  let scrollTop = 0;
  Object.defineProperty(container, "scrollHeight", { value: 2000 });
  Object.defineProperty(container, "clientHeight", { value: 600 });
  Object.defineProperty(container, "scrollTop", { get: () => scrollTop });
  const scrollTo = vi.fn(({ top }: { top: number }) => {
    scrollTop = top;
  });
  container.scrollTo = scrollTo as unknown as typeof container.scrollTo;

  const rect = (top: number, bottom: number) => ({ top, bottom }) as DOMRect;
  // スクロール領域の下端はキーボードで上がる(シートが縮む)
  const box = { bottom: boxBottom };
  container.getBoundingClientRect = () => rect(100, box.bottom);
  input.getBoundingClientRect = () => rect(inputTop - scrollTop, inputTop + 40 - scrollTop);
  actions.getBoundingClientRect = () =>
    rect(actionsBottom - 32 - scrollTop, actionsBottom - scrollTop);

  input.focus();

  return { container, input, actions, scrollTo, box, scrolled: () => scrollTop };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("revealAfterKeyboard", () => {
  it("キーボードで縮んで隠れた入力欄を、見える位置へ送る", () => {
    // 開く前: 領域は 100〜700、入力欄は 500〜540(見えている)
    const { input, box, scrolled } = setup({ boxBottom: 700, inputTop: 500, actionsBottom: 640 });

    revealAfterKeyboard(input);
    vi.advanceTimersByTime(250);
    expect(scrolled()).toBe(0);

    // キーボードが出て領域の下端が 400 へ上がる → 入力欄の下端(540)が 392 に来るまで送る
    box.bottom = 400;
    vi.advanceTimersByTime(750);
    expect(scrolled()).toBe(148);
  });

  it("toEnd なら、見えていても一番下まで送る", () => {
    // scrollHeight 2000・clientHeight 600 なので一番下は 1400。ただし入力欄(300)の上端を
    // 見える範囲の上(108)へ追い出さないところで止める → 192
    const { input, scrolled } = setup({ boxBottom: 700, inputTop: 300, actionsBottom: 440 });

    revealAfterKeyboard(input, { toEnd: true });
    vi.advanceTimersByTime(1000);
    expect(scrolled()).toBe(192);
  });

  it("toEnd で末尾が近ければ、ちょうど一番下で止まる", () => {
    // 入力欄が十分下(1800)にあれば、上端の制限より先に末尾(1400)へ着く
    const { input, scrolled } = setup({ boxBottom: 700, inputTop: 1800, actionsBottom: 1940 });

    revealAfterKeyboard(input, { toEnd: true });
    vi.advanceTimersByTime(1000);
    expect(scrolled()).toBe(1400);
  });

  it("見えていれば動かさない", () => {
    const { input, scrollTo } = setup({ boxBottom: 700, inputTop: 300, actionsBottom: 440 });

    revealAfterKeyboard(input);
    vi.advanceTimersByTime(1000);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("フォーカスが外れていたら割り込まない", () => {
    const { input, box, scrollTo } = setup({ boxBottom: 700, inputTop: 500, actionsBottom: 640 });

    revealAfterKeyboard(input, { toEnd: true });
    input.blur();
    box.bottom = 400;
    vi.advanceTimersByTime(1000);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
