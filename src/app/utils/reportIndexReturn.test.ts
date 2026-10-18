// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import {
  REPORT_INDEX_RETURN_KEY,
  clearReportIndexReturn,
  markReportIndexReturn,
  parseReportIndexReturn,
  reportTileAnchorId,
} from "@app/utils/reportIndexReturn";

const DATA = { history: [{ year_month: "2026-09" }], environmentStats: [], lastWeekStat: null };

afterEach(() => {
  document.body.innerHTML = "";
  sessionStorage.clear();
});

describe("markReportIndexReturn / parseReportIndexReturn", () => {
  it("一覧の材料と押したタイルの高さを控え、読み戻せる", () => {
    const tile = document.createElement("a");
    tile.id = reportTileAnchorId("month-2026-09");
    tile.getBoundingClientRect = () => ({ top: 512, width: 100 }) as DOMRect;
    document.body.appendChild(tile);

    markReportIndexReturn({ userId: "u1", anchorId: tile.id, data: DATA });

    const restored = parseReportIndexReturn(sessionStorage.getItem(REPORT_INDEX_RETURN_KEY));
    expect(restored).toMatchObject({ userId: "u1", anchorId: tile.id, data: DATA });
    expect(typeof restored?.savedAt).toBe("number");
    expect(sessionStorage.getItem(`returnAnchorTop:${tile.id}`)).toBe("512");
  });

  it("消したあとは何も戻さない", () => {
    markReportIndexReturn({ userId: "u1", anchorId: "x", data: DATA });
    clearReportIndexReturn();

    expect(parseReportIndexReturn(sessionStorage.getItem(REPORT_INDEX_RETURN_KEY))).toBeNull();
  });

  it("壊れた値・形の違う値は null にする(先頭から出す)", () => {
    expect(parseReportIndexReturn(null)).toBeNull();
    expect(parseReportIndexReturn("{")).toBeNull();
    expect(parseReportIndexReturn("1")).toBeNull();
    expect(
      parseReportIndexReturn(JSON.stringify({ userId: "u1", anchorId: "x", savedAt: 1 })),
    ).toBeNull();
    expect(
      parseReportIndexReturn(JSON.stringify({ userId: "u1", anchorId: 1, data: {}, savedAt: 1 })),
    ).toBeNull();
  });
});
