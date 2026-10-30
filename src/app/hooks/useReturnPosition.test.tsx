// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ReturnPositionArea from "@app/components/molecules/ReturnPositionArea";
import CityleagueLatestReturnArea from "@app/components/organisms/Cityleague/CityleagueLatestReturnArea";

import { returnPositionKey } from "@app/hooks/useReturnPosition";
import {
  CITYLEAGUE_LATEST_RETURN_KEY,
  CITYLEAGUE_SCROLL_TO_ID_KEY,
} from "@app/utils/cityleagueScrollRestore";
import { noteReturnNavigation } from "@app/utils/returnNavigation";
import { writeReturnTarget } from "@app/utils/returnTarget";

const PATH = "/cityleague_results/environments";
const KEY = returnPositionKey(PATH);

vi.mock("next/navigation", () => ({
  usePathname: () => "/cityleague_results/environments",
}));

// 画面に貼り付いた戻るリンクの行き先
const BACK_HREF = "/cityleague_results";

const HREFS = [
  "/cityleague_results/environments/1",
  "/cityleague_results/environments/2",
  "/cityleague_results/environments/3",
  "/cityleague_results/environments/4",
  "/cityleague_results/environments/5",
];

function Links({ withPinned = false }: { withPinned?: boolean }) {
  return (
    <>
      {/* 画面に貼り付いた戻るリンク(大型大会の区分ページ・個別ページ) */}
      {withPinned && (
        <div style={{ position: "sticky" }}>
          <a href={BACK_HREF}>戻る</a>
        </div>
      )}
      {HREFS.map((href) => (
        <a key={href} href={href}>
          {href}
        </a>
      ))}
    </>
  );
}

/*
 * jsdom は配置を計算しない。リンクはページの上端から offset の位置から 100px ずつ並んでいる扱いにする。
 * 貼り付いた戻るリンクは常に画面の上端(56px)にある。画面の高さは jsdom の既定(768px)
 */
let scrollOffset = 0;
let offset = 1000;

beforeEach(() => {
  scrollOffset = 0;
  offset = 1000;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
    this: Element,
  ) {
    const href = this.getAttribute("href");
    // 包んだ範囲(リンクの並びの上から 500px ぶん長い)
    if (this.tagName === "DIV" && this.querySelector(`a[href="${HREFS[0]}"]`)) {
      const top = offset - scrollOffset;
      return {
        top,
        bottom: top + HREFS.length * 100 + 500,
        width: 300,
        height: 1000,
      } as DOMRect;
    }
    if (href === BACK_HREF) {
      return { top: 56, bottom: 90, width: 100, height: 34 } as DOMRect;
    }
    const index = HREFS.indexOf(href ?? "");
    if (this.tagName !== "A" || index < 0) {
      return { top: 0, bottom: 0, width: 0, height: 0 } as DOMRect;
    }
    const top = offset + index * 100 - scrollOffset;
    return { top, bottom: top + 100, width: 300, height: 100 } as DOMRect;
  });
});

beforeEach(() => {
  // 送り先まで届く長さのページ(足りないと伸びるのを待つ)
  vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(10000);
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

// 画面をずらしてスクロールイベントを送る(スクロールのたびに画面上端の目印を覚える)
function scrollPage(value: number) {
  scrollOffset = value;
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

function saved(key = KEY) {
  const raw = sessionStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
}

function save(key: string, href: string, top: number) {
  writeReturnTarget(
    key,
    JSON.stringify({ key: `href:${href}`, nth: 0, top, savedAt: Date.now() }),
  );
}

// 控えたあとに、このページへ戻ってきたことにする(時刻は控えより後にずらす)
async function returnHere() {
  await new Promise((resolve) => setTimeout(resolve, 2));
  noteReturnNavigation(PATH);
}

describe("ReturnPositionArea", () => {
  it("離れるときに、画面上端のリンクとその高さをページごとに控える", () => {
    const { unmount } = render(
      <ReturnPositionArea>
        <Links />
      </ReturnPositionArea>,
    );

    // 2本目(上端 1100px)の途中まで送る。1本目は画面の上へ抜けている
    scrollPage(1150);
    unmount();

    expect(saved()).toMatchObject({ key: `href:${HREFS[1]}`, nth: 0, top: -50 });
  });

  it("画面に貼り付いたリンク(sticky の戻るリンク)は目印にしない", () => {
    const { unmount } = render(
      <ReturnPositionArea>
        <Links withPinned />
      </ReturnPositionArea>,
    );

    scrollPage(1150);
    unmount();

    expect(saved()).toMatchObject({ key: `href:${HREFS[1]}` });
  });

  it("画面にリンクが無い所(範囲の末尾の余白)では、範囲そのものの位置を控えて戻す", async () => {
    const { unmount } = render(
      <ReturnPositionArea>
        <Links />
      </ReturnPositionArea>,
    );

    // リンクの並び(1000〜1500px)を過ぎ、範囲の末尾(〜2000px)だけが画面にある
    scrollPage(1600);
    unmount();
    expect(saved()).toMatchObject({ key: "root", top: -600 });

    await returnHere();
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(5000);
    scrollOffset = 0;
    render(
      <ReturnPositionArea>
        <Links />
      </ReturnPositionArea>,
    );

    await waitFor(() =>
      expect(scrollTo).toHaveBeenCalledWith({ top: 1600, behavior: "auto" }),
    );
  });

  // 目印は前回見つけた位置から前後へ探す。下へ送ってから戻しても、上側の目印を取り違えない
  it("下へ送ってから上へ戻したときも、画面上端のリンクを控える", () => {
    const { unmount } = render(
      <ReturnPositionArea>
        <Links />
      </ReturnPositionArea>,
    );

    scrollPage(1350);
    scrollPage(1050);
    unmount();

    expect(saved()).toMatchObject({ key: `href:${HREFS[0]}`, top: -50 });
  });

  it("同じ href のリンクが並ぶときは、何番目かも控える", () => {
    // リンクは2組。上端 1000px から 120px ずつ並ぶ扱い
    vi.mocked(Element.prototype.getBoundingClientRect).mockImplementation(function (
      this: Element,
    ) {
      if (this.tagName === "DIV" && this.querySelector("a")) {
        const top = 1000 - scrollOffset;
        return { top, bottom: top + 2000, width: 300, height: 2000 } as DOMRect;
      }
      const links = [...document.querySelectorAll("a")];
      const top = 1000 + links.indexOf(this as HTMLAnchorElement) * 120 - scrollOffset;
      return { top, bottom: top + 120, width: 300, height: 120 } as DOMRect;
    });
    const { unmount } = render(
      <ReturnPositionArea>
        <Links />
        <Links />
      </ReturnPositionArea>,
    );

    // 2組目の1本目(上端 1600px)が画面の上端にある
    scrollPage(1600);
    unmount();

    expect(saved()).toMatchObject({ key: `href:${HREFS[0]}`, nth: 1, top: 0 });
  });

  it("ページごとの控えは新しいものから30件だけ残す", () => {
    for (let i = 0; i < 35; i += 1) {
      sessionStorage.setItem(
        returnPositionKey(`/old/${i}`),
        JSON.stringify({ key: "root", nth: 0, top: 0, savedAt: i + 1 }),
      );
    }
    const { unmount } = render(
      <ReturnPositionArea>
        <Links />
      </ReturnPositionArea>,
    );

    scrollPage(1150);
    unmount();

    const kept = Object.keys(sessionStorage).filter((key) =>
      key.startsWith("returnPosition:"),
    );
    expect(kept).toHaveLength(30);
    // 今書いたものは残り、古いもの(savedAt の小さいもの)から消える
    expect(kept).toContain(KEY);
    expect(kept).not.toContain(returnPositionKey("/old/0"));
    expect(kept).toContain(returnPositionKey("/old/34"));
  });

  // iOS はスクロールアンカリングが無く、上の中身が伸びて目印が動いてもスクロールイベントが出ない
  it("スクロールしなくても、中身の大きさが変わったら覚え直す", () => {
    let resized: () => void = () => {};
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resized = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    const { unmount } = render(
      <ReturnPositionArea>
        <Links />
      </ReturnPositionArea>,
    );
    scrollPage(1150);

    // 上の画像が読み込まれて、リンクが 30px 下がった
    offset = 1030;
    act(() => resized());
    unmount();

    expect(saved()).toMatchObject({ key: `href:${HREFS[1]}`, top: -20 });
    vi.unstubAllGlobals();
  });

  it("覚えた目印が描き直しで差し替わっていたら控えない(別の要素を指さない)", () => {
    const { rerender, unmount } = render(
      <ReturnPositionArea>
        <Links key="a" />
      </ReturnPositionArea>,
    );
    scrollPage(1150);

    rerender(
      <ReturnPositionArea>
        <Links key="b" />
      </ReturnPositionArea>,
    );
    unmount();

    expect(saved()).toBeNull();
  });

  // スマホのアドレスバーの出入りで画面の高さが変わるぶん、一番下まで届かないことがある
  it("戻った位置までページの長さがわずかに足りないだけなら、待たずに合わせる", async () => {
    save(KEY, HREFS[3], 200);
    await returnHere();
    // 送り先は 1100px だが、送れるのは 1032px(1800 - 768)まで
    vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(1800);
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const start = performance.now();

    render(
      <ReturnPositionArea>
        <Links />
      </ReturnPositionArea>,
    );

    await waitFor(() =>
      expect(scrollTo).toHaveBeenCalledWith({ top: 1100, behavior: "auto" }),
    );
    expect(performance.now() - start).toBeLessThan(1000);
  });

  it("大きく足りないときは、ページが伸びるのを待ってから合わせる", async () => {
    save(KEY, HREFS[3], 200);
    await returnHere();
    let height = 1000;
    vi.spyOn(document.documentElement, "scrollHeight", "get").mockImplementation(
      () => height,
    );
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    render(
      <ReturnPositionArea>
        <Links />
      </ReturnPositionArea>,
    );

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(scrollTo).not.toHaveBeenCalled();

    // 後から流し込まれる部分が届いた
    height = 5000;
    await waitFor(() =>
      expect(scrollTo).toHaveBeenCalledWith({ top: 1100, behavior: "auto" }),
    );
  });

  it("戻った位置へ合わせる前に離れたら、まだ使っていない控えを残す", async () => {
    save(KEY, HREFS[3], 200);
    await returnHere();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    // 目印がまだ届いていない(後から流し込まれる部分)うちに離れる
    const { unmount } = render(<ReturnPositionArea>{null}</ReturnPositionArea>);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    unmount();

    expect(saved()).toMatchObject({ key: `href:${HREFS[3]}`, top: 200 });
  });

  it("中身が画面に入っていなければ控えない", () => {
    offset = 2000;
    const { unmount } = render(
      <ReturnPositionArea>
        <Links />
      </ReturnPositionArea>,
    );

    unmount();

    expect(saved()).toBeNull();
  });

  /*
   * ブラウザの戻る/進むで離れるときは、先頭リセットが popstate の中でこの部品が外れるより先に走る。
   * リセット後の位置(先頭)で控えると、戻ったときに先頭から表示される
   */
  it("別のページへの popstate を受けたあとのスクロールでは覚え直さない", () => {
    const { unmount } = render(
      <ReturnPositionArea>
        <Links />
      </ReturnPositionArea>,
    );

    scrollPage(1150);
    window.history.replaceState(null, "", HREFS[1]);
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    scrollPage(0);
    unmount();

    expect(saved()).toMatchObject({ key: `href:${HREFS[1]}`, top: -50 });
  });

  it("戻ってきたら、控えたリンクを同じ高さに置いて控えを消す(上の中身の長さが変わっていても)", async () => {
    save(KEY, HREFS[3], 200);
    await returnHere();
    offset = 600;
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    render(
      <ReturnPositionArea>
        <Links />
      </ReturnPositionArea>,
    );

    // 4本目は今 600 + 300 = 900px。200px に置くには 700px 送る
    await waitFor(() =>
      expect(scrollTo).toHaveBeenCalledWith({ top: 700, behavior: "auto" }),
    );
    expect(saved()).toBeNull();
  });

  it("目印が後から現れても(後から流し込まれる部分)、現れたところで合わせる", async () => {
    save(KEY, HREFS[3], 200);
    await returnHere();
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    const { rerender } = render(<ReturnPositionArea>{null}</ReturnPositionArea>);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(scrollTo).not.toHaveBeenCalled();

    rerender(
      <ReturnPositionArea>
        <Links />
      </ReturnPositionArea>,
    );

    await waitFor(() =>
      expect(scrollTo).toHaveBeenCalledWith({ top: 1100, behavior: "auto" }),
    );
  });

  it("戻ってきたのでなければ(開き直した)控えを使わずに消す", async () => {
    save(KEY, HREFS[3], 200);
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    render(
      <ReturnPositionArea>
        <Links />
      </ReturnPositionArea>,
    );

    await waitFor(() => expect(saved()).toBeNull());
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

describe("CityleagueLatestReturnArea", () => {
  // 一覧とリンク集の両方で位置を合わせると、後から動いた方が勝ってずれる
  it("一覧がこの離れ方で戻り先のカードを控えたら、リンク集は控えない", () => {
    const { unmount } = render(
      <CityleagueLatestReturnArea>
        <Links />
      </CityleagueLatestReturnArea>,
    );
    scrollPage(1150);

    // 一覧が先に外れて、画面に見えていたカードを控えた
    writeReturnTarget(CITYLEAGUE_SCROLL_TO_ID_KEY, "55");
    unmount();

    expect(saved(CITYLEAGUE_LATEST_RETURN_KEY)).toBeNull();
  });

  it("現れる前から残っている一覧の控えは見ない(リンク集の位置を控える)", () => {
    writeReturnTarget(CITYLEAGUE_SCROLL_TO_ID_KEY, "55");
    const { unmount } = render(
      <CityleagueLatestReturnArea>
        <Links />
      </CityleagueLatestReturnArea>,
    );
    scrollPage(1150);

    unmount();

    expect(saved(CITYLEAGUE_LATEST_RETURN_KEY)).toMatchObject({
      key: `href:${HREFS[1]}`,
    });
  });

  it("戻ってきたら、リンク集の位置へ戻す", async () => {
    save(CITYLEAGUE_LATEST_RETURN_KEY, HREFS[3], 200);
    await returnHere();
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    render(
      <CityleagueLatestReturnArea>
        <Links />
      </CityleagueLatestReturnArea>,
    );

    await waitFor(() =>
      expect(scrollTo).toHaveBeenCalledWith({ top: 1100, behavior: "auto" }),
    );
  });
});
