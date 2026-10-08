// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useReturnTargetItem } from "@app/hooks/useReturnTargetItem";
import { writeReturnTarget } from "@app/utils/returnTarget";
import { writeSessionStorage } from "@app/utils/sessionStorageStore";

const KEY = "returnTargetTest";

afterEach(() => {
  cleanup();
  writeSessionStorage(KEY, null);
});

describe("useReturnTargetItem", () => {
  it("現れた後に「進む直前の書き込み」で書かれた値は受け取らない", () => {
    const { result } = renderHook(() => useReturnTargetItem(KEY));
    expect(result.current).toBeNull();

    // 一覧のカードから別のページへ進む直前(この一覧はまだ画面に残っている)
    act(() => writeReturnTarget(KEY, "a"));

    expect(result.current).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBe("a");
  });

  it("書かれた後に現れた読み手(戻ってきた一覧)は受け取る", () => {
    writeReturnTarget(KEY, "a");

    const { result } = renderHook(() => useReturnTargetItem(KEY));

    expect(result.current).toBe("a");
  });

  it("普通の書き込み(詳細ページが離れるときの書き戻し)には現れた後でも追随する", () => {
    // 進む直前に書かれ、詳細ページがいったん退避して消した状態で、戻り先の一覧が現れる
    writeReturnTarget(KEY, "a");
    writeSessionStorage(KEY, null);
    const { result } = renderHook(() => useReturnTargetItem(KEY));
    expect(result.current).toBeNull();

    // 詳細ページのアンマウントで書き戻される
    act(() => writeSessionStorage(KEY, "a"));

    expect(result.current).toBe("a");
  });

  it("受け取った後に消えたら null に戻る", () => {
    writeReturnTarget(KEY, "a");
    const { result } = renderHook(() => useReturnTargetItem(KEY));

    act(() => writeSessionStorage(KEY, null));

    expect(result.current).toBeNull();
  });
});
