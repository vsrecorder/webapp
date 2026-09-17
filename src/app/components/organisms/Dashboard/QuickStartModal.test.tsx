// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useShouldShowQuickStart } from "@app/components/organisms/Dashboard/QuickStartModal";

const DISMISS_KEY = "quick_start_modal_dismissed_at";

describe("useShouldShowQuickStart", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("抑止の記録が無ければ出す", () => {
    const { result } = renderHook(() => useShouldShowQuickStart());

    expect(result.current).toBe(true);
  });

  it("1日以内に出していれば出さない", () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));

    const { result } = renderHook(() => useShouldShowQuickStart());

    expect(result.current).toBe(false);
  });

  it("1日を過ぎていれば出す", () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() - 2 * 24 * 60 * 60 * 1000));

    const { result } = renderHook(() => useShouldShowQuickStart());

    expect(result.current).toBe(true);
  });

  it("開き直したら抑止の記録から決め直す", () => {
    // 出した時点で抑止を記録する。同じ文書の中でホームを開き直したとき、
    // 前回の「出す」を持ち越すと、閉じた直後でもまた出てしまう
    const first = renderHook(() => useShouldShowQuickStart());
    expect(first.result.current).toBe(true);
    first.unmount();

    localStorage.setItem(DISMISS_KEY, String(Date.now()));

    const second = renderHook(() => useShouldShowQuickStart());
    expect(second.result.current).toBe(false);
  });
});
