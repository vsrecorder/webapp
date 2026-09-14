// @vitest-environment jsdom
import { renderToString } from "react-dom/server";
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Theme } from "react-select";

import { useReactSelectTheme } from "@app/components/molecules/Select/useReactSelectTheme";

// react-select が渡してくる既定テーマの、判定に使う部分だけを模した値
const BASE_NEUTRAL0 = "#ffffff";
const base = { colors: { neutral0: BASE_NEUTRAL0 } } as unknown as Theme;

function Probe() {
  const theme = useReactSelectTheme();
  return <span>{theme(base).colors.neutral0}</span>;
}

describe("useReactSelectTheme", () => {
  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("サーバ描画では、<html> に dark が付いていても既定(ライト)の配色を返す", () => {
    // サーバに <html> のクラスは無い。ここでダークにすると、クライアントの最初の描画と
    // 食い違って React が属性を直さなくなり、セレクターが白いまま固まる
    document.documentElement.classList.add("dark");

    expect(renderToString(<Probe />)).toContain(BASE_NEUTRAL0);
  });

  it("ハイドレーション後、<html> に dark が付いていればダークの配色にする", () => {
    document.documentElement.classList.add("dark");

    const { result } = renderHook(() => useReactSelectTheme());

    expect(result.current(base).colors.neutral0).not.toBe(BASE_NEUTRAL0);
  });

  it("dark が付いていなければ既定の配色のまま", () => {
    const { result } = renderHook(() => useReactSelectTheme());

    expect(result.current(base).colors.neutral0).toBe(BASE_NEUTRAL0);
  });
});
