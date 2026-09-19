import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  CHART_BOX_DETAIL,
  CHART_BOX_NORMAL,
  CHART_SIZE,
  CHART_SIZE_DETAIL,
  toChartPadding,
} from "@app/components/organisms/DeckUsage/pieChartLayout";

const dir = fileURLToPath(new URL(".", import.meta.url));

// 円グラフを描く側のファイル。寸法はすべて pieChartLayout から取る
const CHART_FILES = [
  "DeckUsagePanel.tsx",
  "OpponentDeckDistributionChart.tsx",
  "DeckUsageEmptyState.tsx",
];

describe("CHART_BOX", () => {
  it("余白の外に円の直径ぶんがそのまま残る高さになっている", () => {
    // chart.js は描画領域(高さ - 上下の余白)の短辺から半径を決めるため、
    // この関係が崩れると円の大きさが変わる
    expect(CHART_BOX_NORMAL.height - CHART_BOX_NORMAL.padding.y * 2).toBe(CHART_SIZE);
    expect(CHART_BOX_DETAIL.height - CHART_BOX_DETAIL.padding.y * 2).toBe(CHART_SIZE_DETAIL);
  });

  it("詳細カード表示中の方が余白が小さく、円は大きい", () => {
    expect(CHART_BOX_DETAIL.padding.x).toBeLessThan(CHART_BOX_NORMAL.padding.x);
    expect(CHART_BOX_DETAIL.padding.y).toBeLessThan(CHART_BOX_NORMAL.padding.y);
    expect(CHART_SIZE_DETAIL).toBeGreaterThan(CHART_SIZE);
  });
});

describe("toChartPadding", () => {
  it("x/y を四辺に展開する", () => {
    expect(toChartPadding({ padding: { x: 64, y: 88 }, height: 368 })).toEqual({
      top: 88,
      bottom: 88,
      left: 64,
      right: 64,
    });
  });
});

describe("円グラフの寸法の持ち方", () => {
  // データが無いときのダミー円グラフ(DeckUsageEmptyState)だけが上下の余白を64pxで
  // 持っていたため、データの有無が切り替わると円の中心が24px上下にずれ、
  // 入れ物の高さも48px変わってちらついていた。寸法を各ファイルに置き直さないことで防ぐ。
  it.each(CHART_FILES)("%s は寸法をローカルに定義し直さない", (file) => {
    const src = readFileSync(join(dir, file), "utf8");

    expect(src).not.toMatch(/const\s+(CHART_SIZE|EXTERNAL_SPRITE_PADDING)\w*\s*=/);
    // layout.padding に数値リテラルを直接渡していないこと
    expect(src).not.toMatch(/layout:\s*\{\s*padding:\s*\d/);
  });

  it.each(CHART_FILES)("%s の円グラフは CHART_BOX_NORMAL の高さを使う", (file) => {
    const src = readFileSync(join(dir, file), "utf8");

    expect(src).toMatch(/CHART_BOX_NORMAL/);
    expect(src).toMatch(/toChartPadding\(CHART_BOX_NORMAL\)/);
  });
});
