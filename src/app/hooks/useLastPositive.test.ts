// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";

import { useLastPositive } from "./useLastPositive";

describe("useLastPositive", () => {
  afterEach(cleanup);

  it("正の値はそのまま返す", () => {
    const { result, rerender } = renderHook(({ v }) => useLastPositive(v), {
      initialProps: { v: 3 },
    });
    expect(result.current).toBe(3);

    rerender({ v: 2 });
    expect(result.current).toBe(2);
  });

  it("0 になったら直前の正の値を返し続ける", () => {
    const { result, rerender } = renderHook(({ v }) => useLastPositive(v), {
      initialProps: { v: 2 },
    });
    rerender({ v: 1 });
    rerender({ v: 0 });
    expect(result.current).toBe(1);

    rerender({ v: 0 });
    expect(result.current).toBe(1);
  });

  it("0 から再び増えたら新しい値を返す", () => {
    const { result, rerender } = renderHook(({ v }) => useLastPositive(v), {
      initialProps: { v: 1 },
    });
    rerender({ v: 0 });
    rerender({ v: 4 });
    expect(result.current).toBe(4);
  });

  it("最初から 0 のときは 0 を返す", () => {
    const { result } = renderHook(() => useLastPositive(0));
    expect(result.current).toBe(0);
  });
});
