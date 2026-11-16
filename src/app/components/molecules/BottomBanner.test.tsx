// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BottomBanner from "@app/components/molecules/BottomBanner";

// jsdom には ResizeObserver が無い。測り直しの中身はここでは見ないので空でよい
class ResizeObserverStub {
  observe() {}
  disconnect() {}
}

function bannerHeightVar(): string {
  return document.documentElement.style.getPropertyValue("--recording-bar-height");
}

describe("BottomBanner", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    document.documentElement.style.removeProperty("--recording-bar-height");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("既定では暗幕を出さず、帯は z-40(モーダルより下)に置く", () => {
    const { container } = render(
      <BottomBanner dismissLabel="閉じる" onDismiss={vi.fn()}>
        <div>帯の中身</div>
      </BottomBanner>,
    );

    expect(container.querySelector(".bottom-banner-dim")).toBeNull();
    const frame = screen.getByText("帯の中身").parentElement?.parentElement;
    expect(frame?.className).toContain("z-40");
  });

  it("dimBackground では全画面の暗幕を敷き、帯をその一つ上の段に置く", () => {
    const { container } = render(
      <BottomBanner dimBackground dismissLabel="閉じる" onDismiss={vi.fn()}>
        <div>帯の中身</div>
      </BottomBanner>,
    );

    const dim = container.querySelector(".bottom-banner-dim");
    expect(dim).toBeTruthy();
    // 暗いだけで、背面のタップは止めない。読み上げにも出さない
    expect(dim?.className).toContain("pointer-events-none");
    expect(dim?.getAttribute("aria-hidden")).toBe("true");
    expect(dim?.className).toContain("inset-0");
    // 段は globals.css の表のとおり。暗幕 45 < 帯 46(DOM の並びには頼らない)
    expect(dim?.className).toContain("z-[45]");
    const frame = screen.getByText("帯の中身").parentElement?.parentElement;
    expect(frame?.className).toContain("z-[46]");
  });

  it("帯の高さを CSS 変数に載せ、消えたら 0 に戻す", () => {
    const { unmount } = render(
      <BottomBanner dismissLabel="閉じる" onDismiss={vi.fn()}>
        <div>帯の中身</div>
      </BottomBanner>,
    );

    // jsdom の offsetHeight は 0 なので、下部ナビとの隙間(8px)だけが載る。
    // 測る要素(ref)が付いていないと、ここが空のままになる
    expect(bannerHeightVar()).toBe("8px");

    unmount();
    expect(bannerHeightVar()).toBe("0px");
  });
});
