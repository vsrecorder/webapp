// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import { platformDetectScript } from "@app/utils/platformDetectScript";

const COLOR = "#2563EB";

/** UA と display-mode を差し替えてスクリプトを実行する */
function run({ ua, standalone }: { ua: string; standalone: boolean }) {
  Object.defineProperty(window.navigator, "userAgent", { value: ua, configurable: true });
  Object.defineProperty(window.navigator, "maxTouchPoints", { value: 0, configurable: true });
  window.matchMedia = ((query: string) =>
    ({ matches: standalone && query === "(display-mode: standalone)" }) as MediaQueryList) as typeof window.matchMedia;
  new Function(platformDetectScript(COLOR))();
}

function themeColorMetas() {
  return Array.from(document.head.querySelectorAll('meta[name="theme-color"]'));
}

afterEach(() => {
  document.documentElement.removeAttribute("data-android");
  document.documentElement.removeAttribute("data-ios-pwa");
  themeColorMetas().forEach((m) => m.remove());
});

const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36";
const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";

describe("platformDetectScript", () => {
  it("Android の standalone PWA では data-android と theme-color の meta を付ける", () => {
    run({ ua: ANDROID_UA, standalone: true });
    expect(document.documentElement.getAttribute("data-android")).toBe("true");
    expect(document.documentElement.hasAttribute("data-ios-pwa")).toBe(false);
    expect(themeColorMetas().map((m) => m.getAttribute("content"))).toEqual([COLOR]);
  });

  it("Android のブラウザ表示では data-android だけで、theme-color は付けない", () => {
    // 付けると Chrome のアドレスバーまでヘッダー色になる。PWA の起動画面対策の範囲に留める
    run({ ua: ANDROID_UA, standalone: false });
    expect(document.documentElement.getAttribute("data-android")).toBe("true");
    expect(themeColorMetas()).toHaveLength(0);
  });

  it("iOS の standalone PWA では data-ios-pwa だけで、theme-color は付けない", () => {
    // iOS では theme-color がそのままステータスバーの地色になり、見た目が変わってしまう
    run({ ua: IOS_UA, standalone: true });
    expect(document.documentElement.getAttribute("data-ios-pwa")).toBe("true");
    expect(document.documentElement.hasAttribute("data-android")).toBe(false);
    expect(themeColorMetas()).toHaveLength(0);
  });

  it("色が #RRGGBB でなければ生成時に落とす(スクリプト文字列への混入防止)", () => {
    expect(() => platformDetectScript("red")).toThrow();
    expect(() => platformDetectScript("#2563EB';alert(1);'")).toThrow();
  });
});
