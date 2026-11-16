import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { OVERLAY_BACKDROP_MARK } from "@app/utils/closingBackdrop";
import { HEADER_BAR, TOP_CHROME } from "@app/utils/headerBar";

/*
 * 記録中バーの暗幕まわりの重なりの段(globals.css の .bottom-banner-dim の表)が崩れていないか。
 *
 * 段はどれも違う値にして、前後を DOM の並びに頼らないことにしてある。値を1か所だけ変えたり、
 * 上部に z-50 の固定要素を目印なしで足したりすると、暗くならない・モーダルの前に出るなどの
 * 崩れ方をするが、見た目の確認でしか気づけないので、ここで機械的に見張る。
 */

const appDir = fileURLToPath(new URL("..", import.meta.url));
const globalsCss = readFileSync(join(appDir, "globals.css"), "utf8");
const bottomBanner = readFileSync(
  join(appDir, "components/molecules/BottomBanner.tsx"),
  "utf8",
);

// globals.css から「セレクタ { z-index: N; }」の N を読む
function cssZIndex(selector: string): number {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = globalsCss.match(new RegExp(`${escaped}\\s*\\{\\s*z-index:\\s*(\\d+);`));
  if (!match) throw new Error(`globals.css に ${selector} の z-index が見つからない`);
  return Number(match[1]);
}

// BottomBanner.tsx の className から z-[N] を読む(暗幕は bottom-banner-dim と同じ文字列にある)
function bannerZIndex(pattern: RegExp): number {
  const match = bottomBanner.match(pattern);
  if (!match) throw new Error(`BottomBanner.tsx に ${pattern} が見つからない`);
  return Number(match[1]);
}

// HeroUI のモーダル(backdrop・wrapper)の z-index
const MODAL_Z = 50;

describe("記録中バーの暗幕まわりの重なり", () => {
  const topChrome = cssZIndex("body:has(.bottom-banner-dim) .app-top-chrome");
  const dim = bannerZIndex(/bottom-banner-dim[^"]*\bz-\[(\d+)\]/);
  const bar = bannerZIndex(/dimBackground \? "z-\[(\d+)\]"/);
  const nav = cssZIndex("body:has(.bottom-banner-dim) .mobile-nav");

  it("上部の固定要素 < 暗幕 < 記録中バー < 下部ナビ < モーダル の順で、同じ値が無い", () => {
    const order = [topChrome, dim, bar, nav, MODAL_Z];

    // 同じ値があると前後が DOM の並びで決まってしまう
    expect(new Set(order).size).toBe(order.length);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  // 自前の暗幕を持つものが開いている間は消す(二重に暗くならないように)
  it("モーダル・暗幕付きのメニュー・「…」メニューの間は暗幕を消す", () => {
    const rule = globalsCss.match(/body:has\(([^{]*)\)\s*\.bottom-banner-dim\s*\{\s*opacity:\s*0;/);
    expect(rule).not.toBeNull();
    const conditions = rule![1];
    expect(conditions).toContain('[aria-modal="true"]');
    // メニュー・吹き出しの暗幕の目印は utils/closingBackdrop の定数と同じ名前であること
    expect(conditions).toContain(`.${OVERLAY_BACKDROP_MARK}:not(.bg-transparent)`);
    expect(conditions).toContain("[data-dims-page]");
  });

  it("ヘッダー直下のバーには、暗幕の下へ下がる目印が付いている", () => {
    expect(HEADER_BAR.split(" ")).toContain(TOP_CHROME);
    expect(TOP_CHROME).toBe("app-top-chrome");
  });

  /*
   * fixed で z-50 の要素は、上部の固定要素(目印 TOP_CHROME)か下部ナビ(目印 mobile-nav)の
   * どちらかでなければならない。目印が無いと、暗幕(z-45)の上に出て暗くならない
   * (タブのバーで実際に起きた)。
   */
  it("fixed で z-50 の要素は、どれも目印を持っている", () => {
    const files = readdirSync(appDir, { recursive: true, encoding: "utf8" })
      .filter((p) => /\.(tsx|ts)$/.test(p) && !/\.test\.tsx?$/.test(p))
      .map((p) => join(appDir, p));

    const missing: string[] = [];
    for (const file of files) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          // コメント行は除く(説明文に「fixed」「z-50」と書くことがある)
          if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
          if (!/\bfixed\b/.test(line) || !/(^|[\s"`])z-50\b/.test(line)) return;
          if (/TOP_CHROME|app-top-chrome|mobile-nav/.test(line)) return;
          missing.push(`${file.slice(appDir.length)}:${i + 1}`);
        });
    }

    expect(missing).toEqual([]);
  });
});
