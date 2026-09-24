import { describe, expect, it, vi } from "vitest";

import { brandChartGradient } from "@app/utils/chartBrandGradient";

function fakeChart(chartArea: { left: number; right: number } | null) {
  const addColorStop = vi.fn();
  const gradient = { addColorStop } as unknown as CanvasGradient;
  const createLinearGradient = vi.fn(() => gradient);
  return {
    chart: { ctx: { createLinearGradient }, chartArea },
    gradient,
    addColorStop,
    createLinearGradient,
  };
}

describe("brandChartGradient", () => {
  it("描画領域の左端から右端へ、青 → 藍 → 紫のグラデーションを作る", () => {
    const { chart, gradient, addColorStop, createLinearGradient } = fakeChart({
      left: 30,
      right: 330,
    });

    expect(brandChartGradient(chart)).toBe(gradient);
    expect(createLinearGradient).toHaveBeenCalledWith(30, 0, 330, 0);
    expect(addColorStop.mock.calls).toEqual([
      [0, "rgba(37, 99, 235, 1)"],
      [0.5, "rgba(79, 70, 229, 1)"],
      [1, "rgba(109, 40, 217, 1)"],
    ]);
  });

  it("alpha を渡すと各色の不透明度に反映する(線の下の淡い塗り)", () => {
    const { chart, addColorStop } = fakeChart({ left: 0, right: 100 });

    brandChartGradient(chart, 0.1);
    expect(addColorStop.mock.calls.map((c) => c[1])).toEqual([
      "rgba(37, 99, 235, 0.1)",
      "rgba(79, 70, 229, 0.1)",
      "rgba(109, 40, 217, 0.1)",
    ]);
  });

  it("描画領域が決まる前は中心の藍の単色を返す", () => {
    const { chart, createLinearGradient } = fakeChart(null);

    expect(brandChartGradient(chart, 0.5)).toBe("rgba(79, 70, 229, 0.5)");
    expect(createLinearGradient).not.toHaveBeenCalled();
  });
});
