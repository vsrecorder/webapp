// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useRestoredReportIndex } from "@app/hooks/useReportIndexReturn";
import {
  REPORT_INDEX_RETURN_KEY,
  markReportIndexReturn,
} from "@app/utils/reportIndexReturn";
import { noteReturnNavigation } from "@app/utils/returnNavigation";

const DATA = { history: [], environmentStats: [], lastWeekStat: null };

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.useRealTimers();
});

// 控えを書いた少し後に一覧が現れる、という順番を作る
function markThenAdvance(userId = "u1") {
  vi.useFakeTimers();
  vi.setSystemTime(1_000);
  markReportIndexReturn({ userId, anchorId: "report-tile-month-2026-09", data: DATA });
  vi.setSystemTime(2_000);
}

describe("useRestoredReportIndex", () => {
  it("戻ってきたときは控えを受け取る", () => {
    markThenAdvance();
    noteReturnNavigation();

    const { result } = renderHook(() => useRestoredReportIndex("u1"));

    expect(result.current).toMatchObject({ anchorId: "report-tile-month-2026-09", data: DATA });
  });

  it("戻ってきたのでなければ(下部ナビから開き直した等)受け取らず、控えを消す", () => {
    // 控えより前の戻り
    vi.useFakeTimers();
    vi.setSystemTime(500);
    noteReturnNavigation();
    vi.setSystemTime(1_000);
    markReportIndexReturn({ userId: "u1", anchorId: "x", data: DATA });
    vi.setSystemTime(2_000);

    const { result } = renderHook(() => useRestoredReportIndex("u1"));

    expect(result.current).toBeNull();
    expect(sessionStorage.getItem(REPORT_INDEX_RETURN_KEY)).toBeNull();
  });

  it("別のユーザーの控えは使わない", () => {
    markThenAdvance("other");
    noteReturnNavigation();

    const { result } = renderHook(() => useRestoredReportIndex("u1"));

    expect(result.current).toBeNull();
    expect(sessionStorage.getItem(REPORT_INDEX_RETURN_KEY)).toBeNull();
  });

  it("別のページへの戻り(大会結果の戻るリンクなど)は、この一覧への戻りとみなさない", () => {
    markThenAdvance();
    noteReturnNavigation("/cityleague_results");

    const { result } = renderHook(() => useRestoredReportIndex("u1"));

    expect(result.current).toBeNull();
  });
});
