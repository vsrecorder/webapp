// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDayChangedSince } from "@app/hooks/useDayChangedSince";

function Probe({ id }: { id: string | null }) {
  return <span data-testid="changed">{String(useDayChangedSince(id))}</span>;
}

function changed(): string | null {
  return screen.getByTestId("changed").textContent;
}

describe("useDayChangedSince", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // JST 2026-11-16 23:59 = UTC 14:59
    vi.setSystemTime(new Date("2026-11-16T14:59:00Z"));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("表示を始めた日のうちは false", () => {
    render(<Probe id="r1" />);

    expect(changed()).toBe("false");
  });

  it("開いたまま0時を迎えると true になる", () => {
    render(<Probe id="r1" />);

    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });

    expect(changed()).toBe("true");
  });

  it("表示を始めたのが0時過ぎなら false(端末の日付を開催日とは比べない)", () => {
    // JST 2026-11-17 00:01。サーバが今日と判定したものは、端末の日付がずれていても出す
    vi.setSystemTime(new Date("2026-11-16T15:01:00Z"));

    render(<Probe id="r1" />);

    expect(changed()).toBe("false");
  });

  it("別の key に変わったら、その日を起点に取り直す", () => {
    const { rerender } = render(<Probe id="r1" />);
    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });
    expect(changed()).toBe("true");

    rerender(<Probe id="r2" />);

    expect(changed()).toBe("false");
  });

  it("key が null なら false", () => {
    render(<Probe id={null} />);
    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });

    expect(changed()).toBe("false");
  });
});
