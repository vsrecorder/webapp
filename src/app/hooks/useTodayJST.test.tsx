// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTodayJST } from "@app/hooks/useTodayJST";

function Probe() {
  return <span data-testid="today">{useTodayJST()}</span>;
}

describe("useTodayJST", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("今日の暦日(JST)を返す", () => {
    // JST 2026-11-16 23:00 = UTC 14:00
    vi.setSystemTime(new Date("2026-11-16T14:00:00Z"));

    render(<Probe />);

    expect(screen.getByTestId("today").textContent).toBe("2026-11-16");
  });

  it("開いたまま0時を迎えると、翌日に切り替わる", () => {
    vi.setSystemTime(new Date("2026-11-16T14:59:00Z"));

    render(<Probe />);
    expect(screen.getByTestId("today").textContent).toBe("2026-11-16");

    // 次の0時(1分後)に張ったタイマーが鳴る
    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });

    expect(screen.getByTestId("today").textContent).toBe("2026-11-17");
  });

  it("タイマーが遅れても、画面へ戻ったときに読み直す", () => {
    vi.setSystemTime(new Date("2026-11-16T14:00:00Z"));

    render(<Probe />);

    // 止められていた PWA のように、タイマーを鳴らさずに時刻だけ進める
    vi.setSystemTime(new Date("2026-11-17T01:00:00Z"));
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(screen.getByTestId("today").textContent).toBe("2026-11-17");
  });
});
