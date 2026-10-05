// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  RELOAD_BUTTON_ATTR,
  RELOAD_RESTORE_ATTR,
  RELOAD_RESTORE_END_EVENT,
  RELOAD_RESTORING_ATTR,
  RELOAD_RESTORE_STABLE_FRAMES,
  RELOAD_RESTORE_TIMEOUT_MS,
  RELOAD_SCROLL_KEY,
  consumeReloadRestoreStarted,
  isReloadRestoring,
  reloadScrollRestoreScript,
  saveScrollForReload,
} from "@app/utils/reloadScrollRestore";

// jsdom にはレイアウトもスクロールも無いので、文書の高さとスクロール位置を手で持つ
let docHeight = 0;
let scrollY = 0;
let frames: FrameRequestCallback[] = [];
const VIEWPORT = 800;

/** 予約済みの rAF を1フレーム分進める */
function frame() {
  const queued = frames;
  frames = [];
  queued.forEach((cb) => cb(performance.now()));
}

function setNavigationType(type: string) {
  vi.spyOn(performance, "getEntriesByType").mockReturnValue([
    { type } as PerformanceNavigationTiming,
  ]);
}

function saveAt(y: number, href = window.location.href) {
  sessionStorage.setItem(RELOAD_SCROLL_KEY, JSON.stringify({ href, y }));
}

function run() {
  new Function(reloadScrollRestoreScript())();
}

beforeEach(() => {
  docHeight = 3000;
  scrollY = 0;
  frames = [];
  Object.defineProperty(document.documentElement, "scrollHeight", {
    configurable: true,
    get: () => docHeight,
  });
  Object.defineProperty(document.documentElement, "clientHeight", {
    configurable: true,
    value: VIEWPORT,
  });
  Object.defineProperty(window, "scrollY", { configurable: true, get: () => scrollY });
  window.scrollTo = vi.fn((_x: number, y: number) => {
    scrollY = Math.min(y, Math.max(0, docHeight - VIEWPORT));
  }) as unknown as typeof window.scrollTo;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    frames = [];
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  sessionStorage.clear();
  document.documentElement.removeAttribute(RELOAD_RESTORE_ATTR);
  document.documentElement.removeAttribute(RELOAD_RESTORING_ATTR);
  document.body.innerHTML = "";
  document.documentElement.style.overflow = "";
});

describe("saveScrollForReload", () => {
  it("今の URL とスクロール位置を保存する", () => {
    scrollY = 1234;
    saveScrollForReload();
    expect(JSON.parse(sessionStorage.getItem(RELOAD_SCROLL_KEY)!)).toEqual({
      href: window.location.href,
      y: 1234,
    });
  });

  it("復元の最中は、途中の位置ではなく戻そうとしている位置を書く", () => {
    scrollY = 700; // 文書が伸びきる前に切り詰められた途中の位置
    document.documentElement.setAttribute(RELOAD_RESTORING_ATTR, "1500");
    saveScrollForReload();
    expect(JSON.parse(sessionStorage.getItem(RELOAD_SCROLL_KEY)!).y).toBe(1500);
  });
});

describe("consumeReloadRestoreStarted", () => {
  it("目印があれば true を返して消す。2回目は false", () => {
    document.documentElement.setAttribute(RELOAD_RESTORE_ATTR, "");
    expect(consumeReloadRestoreStarted()).toBe(true);
    expect(consumeReloadRestoreStarted()).toBe(false);
  });
});

describe("reloadScrollRestoreScript", () => {
  it("リロードなら最初のフレームで保存した位置へ戻し、目印を付ける", () => {
    setNavigationType("reload");
    saveAt(1500);
    run();

    expect(document.documentElement.hasAttribute(RELOAD_RESTORE_ATTR)).toBe(true);
    expect(scrollY).toBe(0); // ペイント前の rAF で当てる
    frame();
    expect(scrollY).toBe(1500);
  });

  it("文書が短いうちは上限まで当て、伸びたら目的の位置まで追いかける", () => {
    setNavigationType("reload");
    saveAt(2500);
    docHeight = 1800;
    run();

    frame();
    expect(scrollY).toBe(1000); // 1800 - 800 で切り詰め

    docHeight = 4000; // データが届いて伸びた
    frame();
    expect(scrollY).toBe(2500);
  });

  it("目的地に届いても高さが落ち着くまでは、外れた位置を当て直す", () => {
    setNavigationType("reload");
    saveAt(1500);
    run();
    frame();

    scrollY = 1300; // 上側の伸縮などでずれた
    frame();
    expect(scrollY).toBe(1500);
  });

  it("高さが一定フレーム変わらず目的地にいれば終了する", () => {
    setNavigationType("reload");
    saveAt(1500);
    run();
    for (let i = 0; i <= RELOAD_RESTORE_STABLE_FRAMES; i++) frame();
    expect(frames).toHaveLength(0);
  });

  it("復元の最中だけ目印を付け、終わったら外してイベントを投げる", () => {
    const onEnd = vi.fn();
    window.addEventListener(RELOAD_RESTORE_END_EVENT, onEnd);
    try {
      setNavigationType("reload");
      saveAt(1500);
      run();
      expect(isReloadRestoring()).toBe(true);
      expect(document.documentElement.getAttribute(RELOAD_RESTORING_ATTR)).toBe("1500");

      for (let i = 0; i <= RELOAD_RESTORE_STABLE_FRAMES; i++) frame();
      expect(isReloadRestoring()).toBe(false);
      expect(onEnd).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(RELOAD_RESTORE_END_EVENT, onEnd);
    }
  });

  it.each(["wheel", "touchmove", "keydown", "click"])(
    "ユーザーの操作(%s)で打ち切る",
    (type) => {
      setNavigationType("reload");
      saveAt(2500);
      docHeight = 1800;
      run();
      frame();

      document.body.dispatchEvent(new Event(type, { bubbles: true }));
      docHeight = 4000;
      frame();
      expect(scrollY).toBe(1000);
      expect(isReloadRestoring()).toBe(false);
    },
  );

  it("触れただけ(touchstart)や、無効なボタン・再読み込みボタンへの click では打ち切らない", () => {
    // 押せなくした再読み込みボタンに触れても、復元が途中で止まらないように
    setNavigationType("reload");
    saveAt(2500);
    docHeight = 1800;
    run();
    frame();

    const button = document.createElement("button");
    button.disabled = true;
    const icon = document.createElement("svg");
    button.appendChild(icon);
    document.body.appendChild(button);
    window.dispatchEvent(new Event("touchstart"));
    icon.dispatchEvent(new Event("click", { bubbles: true }));
    // 再読み込みボタン自身への click(ハイドレーション前で無効になっていない)も無視する
    const reloadButton = document.createElement("button");
    reloadButton.setAttribute(RELOAD_BUTTON_ATTR, "");
    document.body.appendChild(reloadButton);
    reloadButton.dispatchEvent(new Event("click", { bubbles: true }));

    docHeight = 4000;
    frame();
    expect(scrollY).toBe(2500);
    expect(isReloadRestoring()).toBe(true);
  });

  it("モーダルが開いた(html が overflow:hidden)ら打ち切る", () => {
    setNavigationType("reload");
    saveAt(1500);
    run();
    frame();

    document.documentElement.style.overflow = "hidden";
    scrollY = 0;
    frame();
    expect(scrollY).toBe(0);
    expect(frames).toHaveLength(0);
  });

  it("時間切れで打ち切る", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    setNavigationType("reload");
    saveAt(2500);
    docHeight = 1800; // 伸びないまま
    run();
    frame();

    vi.setSystemTime(Date.now() + RELOAD_RESTORE_TIMEOUT_MS + 1);
    frame();
    expect(frames).toHaveLength(0);
  });

  it("戻る/進む・通常の読み込みでは何もしない", () => {
    for (const type of ["back_forward", "navigate"]) {
      setNavigationType(type);
      saveAt(1500);
      run();
      frame();
      expect(scrollY).toBe(0);
      expect(document.documentElement.hasAttribute(RELOAD_RESTORE_ATTR)).toBe(false);
    }
  });

  it("保存した URL が今の URL と違えば持ち込まない", () => {
    setNavigationType("reload");
    saveAt(1500, "https://example.com/other");
    run();
    frame();
    expect(scrollY).toBe(0);
    expect(document.documentElement.hasAttribute(RELOAD_RESTORE_ATTR)).toBe(false);
  });

  it("始める前に失敗しても、復元中の目印を残さない", () => {
    // 残ると再読み込みボタンが押せないままになる
    setNavigationType("reload");
    saveAt(1500);
    vi.stubGlobal("requestAnimationFrame", () => {
      throw new Error("unavailable");
    });
    expect(run).not.toThrow();
    expect(isReloadRestoring()).toBe(false);
  });

  it("ループの途中で例外が出たら打ち切る(rAF の中の例外を外へ出さない)", () => {
    setNavigationType("reload");
    saveAt(1500);
    window.scrollTo = vi.fn(() => {
      throw new TypeError("unsupported");
    }) as unknown as typeof window.scrollTo;
    run();
    expect(frame).not.toThrow();
    expect(frames).toHaveLength(0);
  });

  it("保存が壊れていても例外を外へ出さない", () => {
    setNavigationType("reload");
    sessionStorage.setItem(RELOAD_SCROLL_KEY, "{");
    expect(run).not.toThrow();
    expect(document.documentElement.hasAttribute(RELOAD_RESTORE_ATTR)).toBe(false);
  });
});
