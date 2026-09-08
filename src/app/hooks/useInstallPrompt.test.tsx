// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useInstallPrompt } from "@app/hooks/useInstallPrompt";

const DISMISS_KEY = "pwa_install_dismissed_at";

const UA_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const UA_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });
}

// jsdom には matchMedia が無い。standalone ではないと答えるものを置く
beforeEach(() => {
  localStorage.clear();
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useInstallPrompt", () => {
  it("iOS では手順案内(ios)になり、発火待ちにはならない", () => {
    setUserAgent(UA_IOS);
    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.installState).toBe("ios");
    expect(result.current.awaitingInstallEvent).toBe(false);
  });

  it("Android では beforeinstallprompt を受け取るまで発火待ちになり、受け取ると android になる", () => {
    setUserAgent(UA_ANDROID);
    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.installState).toBe("idle");
    expect(result.current.awaitingInstallEvent).toBe(true);

    const event = new Event("beforeinstallprompt");
    act(() => {
      window.dispatchEvent(event);
    });

    expect(result.current.awaitingInstallEvent).toBe(false);
    expect(result.current.installState).toBe("android");
  });

  it("Android で猶予が過ぎても発火しなければ発火待ちを終える", () => {
    vi.useFakeTimers();
    setUserAgent(UA_ANDROID);
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.awaitingInstallEvent).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.awaitingInstallEvent).toBe(false);
    expect(result.current.installState).toBe("idle");
  });

  it("閉じると非表示になり、閉じた日時が保存される", () => {
    setUserAgent(UA_IOS);
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.installState).toBe("ios");

    act(() => result.current.dismiss());

    expect(result.current.installState).toBe("idle");
    expect(localStorage.getItem(DISMISS_KEY)).not.toBeNull();
  });

  it("最近閉じていれば最初から非表示で、発火待ちにもならない", () => {
    setUserAgent(UA_ANDROID);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.installState).toBe("idle");
    expect(result.current.awaitingInstallEvent).toBe(false);
  });
});
