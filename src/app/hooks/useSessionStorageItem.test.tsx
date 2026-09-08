// @vitest-environment jsdom
import { renderToString } from "react-dom/server";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useSessionStorageItem } from "@app/hooks/useSessionStorageItem";
import { writeSessionStorage } from "@app/utils/sessionStorageStore";

const KEY = "test:reopen";

function Probe() {
  return <span>{String(useSessionStorageItem(KEY))}</span>;
}

describe("useSessionStorageItem", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("サーバ描画では null", () => {
    expect(renderToString(<Probe />)).toContain("null");
  });

  it("クライアントでは保存済みの値を返し、writeSessionStorage の書き込み・削除にその場で追随する", () => {
    sessionStorage.setItem(KEY, "r1");
    const { result } = renderHook(() => useSessionStorageItem(KEY));
    expect(result.current).toBe("r1");

    act(() => writeSessionStorage(KEY, "r2"));
    expect(result.current).toBe("r2");

    act(() => writeSessionStorage(KEY, null));
    expect(result.current).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });
});
