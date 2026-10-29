// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CityleagueLatestReturnArea from "@app/components/organisms/Cityleague/CityleagueLatestReturnArea";

import {
  CITYLEAGUE_LATEST_RETURN_KEY,
  CITYLEAGUE_SCROLL_TO_ID_KEY,
  markCityleagueLatestReturn,
} from "@app/utils/cityleagueScrollRestore";
import { noteReturnNavigation } from "@app/utils/returnNavigation";

const PATH = "/cityleague_results";

vi.mock("next/navigation", () => ({
  usePathname: () => "/cityleague_results",
}));

const HREFS = [
  "/cityleague_results/dates/2026-10-25",
  "/cityleague_results/101",
  "/cityleague_results/102",
  "/cityleague_results/dates/2026-10-24",
  "/cityleague_results/103",
];

function Area() {
  return (
    <CityleagueLatestReturnArea>
      {HREFS.map((href) => (
        <a key={href} href={href}>
          {href}
        </a>
      ))}
    </CityleagueLatestReturnArea>
  );
}

/*
 * jsdom は配置を計算しない。リンクは上の一覧の下(ページの上端から listHeight)から 100px ずつ
 * 並んでいる扱いにする。画面の高さは jsdom の既定(768px)
 */
let scrollOffset = 0;
let listHeight = 1000;

beforeEach(() => {
  scrollOffset = 0;
  listHeight = 1000;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
    this: Element,
  ) {
    const index = HREFS.indexOf(this.getAttribute("href") ?? "");
    if (this.tagName !== "A" || index < 0) {
      return { top: 0, bottom: 0, width: 0, height: 0 } as DOMRect;
    }
    const top = listHeight + index * 100 - scrollOffset;
    return { top, bottom: top + 100, width: 300, height: 100 } as DOMRect;
  });
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

// 画面をずらしてスクロールイベントを送る(スクロールのたびに画面上端のリンクを覚える)
function scrollPage(offset: number) {
  scrollOffset = offset;
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

function savedReturn() {
  const raw = sessionStorage.getItem(CITYLEAGUE_LATEST_RETURN_KEY);
  return raw === null ? null : JSON.parse(raw);
}

// 控えたあとに、このページへ戻ってきたことにする(時刻は控えより後にずらす)
async function returnHere() {
  await new Promise((resolve) => setTimeout(resolve, 2));
  noteReturnNavigation(PATH);
}

describe("CityleagueLatestReturnArea", () => {
  it("リンク集を見ている間に離れたら、画面上端のリンクとその高さを控える", () => {
    const { unmount } = render(<Area />);

    // 2本目(上端 1100px)の途中まで送る。1本目は画面の上へ抜けている
    scrollPage(1150);
    unmount();

    expect(savedReturn()).toMatchObject({ href: HREFS[1], top: -50 });
  });

  it("リンク集が画面に入っていないとき(上の一覧を見ている)は控えない", () => {
    const { unmount } = render(<Area />);

    scrollPage(100);
    unmount();

    expect(savedReturn()).toBeNull();
  });

  it("一覧のカードから進んだときは控えない(一覧が自分でそのカードへ戻す)", () => {
    const { unmount } = render(<Area />);

    scrollPage(1150);
    sessionStorage.setItem(CITYLEAGUE_SCROLL_TO_ID_KEY, "55");
    unmount();

    expect(savedReturn()).toBeNull();
  });

  /*
   * ブラウザの戻る/進むで離れるときは、先頭リセットが popstate の中でこの部品が外れるより先に走る。
   * リセット後の位置(先頭)で控えると、戻ったときに先頭から表示される
   */
  it("別のページへの popstate を受けたあとのスクロールでは覚え直さない", () => {
    const { unmount } = render(<Area />);

    scrollPage(1150);
    window.history.replaceState(null, "", "/cityleague_results/dates/2026-10-25");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    scrollPage(0);
    unmount();

    expect(savedReturn()).toMatchObject({ href: HREFS[1], top: -50 });
  });

  it("戻ってきたら、控えたリンクを同じ高さに置いて控えを消す(上の一覧の長さが変わっていても)", async () => {
    markCityleagueLatestReturn({ href: HREFS[3], top: 200 });
    await returnHere();
    // 戻ると一覧は1ページ目に戻るので、リンク集は離れたときより上にある
    listHeight = 600;
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    render(<Area />);

    // 4本目は今 600 + 300 = 900px。200px に置くには 700px 送る
    await waitFor(() =>
      expect(scrollTo).toHaveBeenCalledWith({ top: 700, behavior: "auto" }),
    );
    expect(savedReturn()).toBeNull();
  });

  it("戻ってきたのでなければ(開き直した)控えを使わずに消す", async () => {
    markCityleagueLatestReturn({ href: HREFS[3], top: 200 });
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    render(<Area />);

    await waitFor(() => expect(savedReturn()).toBeNull());
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
