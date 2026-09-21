// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { Theme } from "react-select";

import { reactSelectTheme } from "@app/components/molecules/Select/reactSelectStyles";

// react-select が渡してくる既定テーマの、確認に使う部分だけを模した値
const base = {
  colors: { neutral0: "#ffffff", danger: "#DE350B" },
} as unknown as Theme;

afterEach(() => {
  document.documentElement.classList.remove("dark");
});

describe("reactSelectTheme", () => {
  /*
   * 色を JS で出し分けると、サーバ描画では <html> の .dark を読めずライト固定になり、
   * クライアントの最初の描画もそれに合わせるほかない。ダークで開いたときに
   * 選択バーが一瞬白く光るのはそれが理由だった。CSS 変数で渡して避けている。
   */
  it("色は CSS 変数で渡す", () => {
    expect(reactSelectTheme(base).colors.neutral0).toBe("var(--rs-neutral0)");
  });

  it("<html> に dark が付いていてもいなくても同じ値を返す", () => {
    const light = reactSelectTheme(base).colors;

    document.documentElement.classList.add("dark");
    const dark = reactSelectTheme(base).colors;

    expect(dark).toEqual(light);
  });

  it("上書きしない色(danger)は react-select の既定のまま", () => {
    expect(reactSelectTheme(base).colors.danger).toBe("#DE350B");
  });
});
