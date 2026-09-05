// @vitest-environment jsdom
import { renderToString } from "react-dom/server";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useHydrated } from "@app/hooks/useHydrated";

function Probe() {
  return <span>{String(useHydrated())}</span>;
}

describe("useHydrated", () => {
  it("サーバ描画では false(サーバとクライアントで同じ文字を出せる)", () => {
    expect(renderToString(<Probe />)).toContain("false");
  });

  it("クライアントでマウントした後は true", () => {
    const { result } = renderHook(() => useHydrated());

    expect(result.current).toBe(true);
  });
});
