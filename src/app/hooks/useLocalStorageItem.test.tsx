// @vitest-environment jsdom
import { renderToString } from "react-dom/server";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useLocalStorageItem } from "@app/hooks/useLocalStorageItem";
import { writeLocalStorage } from "@app/utils/localStorageStore";

const KEY = "test:item";

function Probe() {
  return <span>{String(useLocalStorageItem(KEY))}</span>;
}

describe("useLocalStorageItem", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("サーバ描画では null(保存の有無によらず同じ文字を出せる)", () => {
    expect(renderToString(<Probe />)).toContain("null");
  });

  it("クライアントでは保存済みの値を返す", () => {
    localStorage.setItem(KEY, "image");
    const { result } = renderHook(() => useLocalStorageItem(KEY));

    expect(result.current).toBe("image");
  });

  it("writeLocalStorage で書くと同じタブ内でその場で追随し、null で削除される", () => {
    const { result } = renderHook(() => useLocalStorageItem(KEY));
    expect(result.current).toBeNull();

    act(() => writeLocalStorage(KEY, "chip"));
    expect(result.current).toBe("chip");
    expect(localStorage.getItem(KEY)).toBe("chip");

    act(() => writeLocalStorage(KEY, null));
    expect(result.current).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("別タブの変更(storage イベント)にも追随する", () => {
    const { result } = renderHook(() => useLocalStorageItem(KEY));

    localStorage.setItem(KEY, "other");
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    });

    expect(result.current).toBe("other");
  });
});
