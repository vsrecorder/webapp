// @vitest-environment jsdom
import { renderToString } from "react-dom/server";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { subscribeWindowResize, useClientValue } from "@app/hooks/useClientValue";

function Probe() {
  return <span>{useClientValue(() => "client", "server")}</span>;
}

describe("useClientValue", () => {
  it("サーバ描画では serverValue を返す", () => {
    expect(renderToString(<Probe />)).toContain("server");
  });

  it("クライアントでは getClientValue の値を返す", () => {
    const { result } = renderHook(() => useClientValue(() => "client", "server"));

    expect(result.current).toBe("client");
  });

  it("subscribe の通知で値を読み直す", () => {
    let width = 320;
    const { result } = renderHook(() =>
      useClientValue(() => width, 0, subscribeWindowResize),
    );
    expect(result.current).toBe(320);

    width = 480;
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toBe(480);
  });
});
