// @vitest-environment jsdom
import { useRef } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Chart as ChartJS } from "chart.js";

import usePieChartFlip, { PIE_FLIP_DURATION_MS } from "@app/hooks/usePieChartFlip";

type Arc = { x: number; y: number; outerRadius: number };

// 円グラフの代わり。resize されると、入れ物の寸法に応じた円(boxes)に変わる
function fakeChart(initial: Arc, boxes: Record<number, Arc>) {
  const arc = { ...initial };
  return {
    arc,
    stop: vi.fn(),
    resize: vi.fn((width: number) => Object.assign(arc, boxes[width])),
    getDatasetMeta: () => ({ data: [arc] }),
  };
}

function Harness({
  chart,
  isDetail,
  boxSize,
  onFlip,
}: {
  chart: ReturnType<typeof fakeChart>;
  isDetail: boolean;
  boxSize: { width: number; height: number };
  onFlip: (el: HTMLDivElement) => void;
}) {
  const chartRef = useRef(chart as unknown as ChartJS<"pie">);
  const boxRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<HTMLDivElement>(null);
  usePieChartFlip({ chartRef, boxRef, flipRef, isDetail });
  return (
    // jsdom にはレイアウトが無いので、入れ物の寸法は style で与える(算出済みの値として読まれる)
    <div ref={boxRef} style={{ width: `${boxSize.width}px`, height: `${boxSize.height}px` }}>
      <div
        ref={(el) => {
          flipRef.current = el;
          if (el) onFlip(el);
        }}
      />
    </div>
  );
}

// style 属性の書き換えを順に記録する(途中で上書きされる transform も拾うため)
function watchStyle(el: HTMLElement) {
  const observer = new MutationObserver(() => {});
  observer.observe(el, { attributes: true, attributeFilter: ["style"], attributeOldValue: true });
  return () => {
    const values = observer.takeRecords().map((r) => r.oldValue ?? "");
    observer.disconnect();
    return [...values, el.getAttribute("style") ?? ""];
  };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const NORMAL: Arc = { x: 150, y: 184, outerRadius: 96 };
const DETAIL: Arc = { x: 90, y: 136, outerRadius: 64 };
const boxes = { 300: NORMAL, 180: DETAIL };

describe("usePieChartFlip", () => {
  it("最初の描画では何もしない(入場アニメを止めない)", () => {
    const chart = fakeChart(NORMAL, boxes);
    render(
      <Harness
        chart={chart}
        isDetail={false}
        boxSize={{ width: 300, height: 368 }}
        onFlip={() => {}}
      />,
    );
    expect(chart.stop).not.toHaveBeenCalled();
    expect(chart.resize).not.toHaveBeenCalled();
  });

  it("開閉すると最終の寸法で1回描き直し、元の円に重なる transform から外していく", () => {
    const chart = fakeChart(NORMAL, boxes);
    let flip!: HTMLDivElement;
    const { rerender } = render(
      <Harness
        chart={chart}
        isDetail={false}
        boxSize={{ width: 300, height: 368 }}
        onFlip={(el) => (flip = el)}
      />,
    );

    const styles = watchStyle(flip);
    rerender(
      <Harness
        chart={chart}
        isDetail
        boxSize={{ width: 180, height: 272 }}
        onFlip={(el) => (flip = el)}
      />,
    );

    // アニメ中でも先送りされないよう止めてから、transform の無い入れ物の寸法で描き直す
    expect(chart.stop).toHaveBeenCalledTimes(1);
    expect(chart.resize).toHaveBeenCalledWith(180, 272);

    // 新しい円(半径64・中心90,136)を、元の円(半径96・中心150,184)に重ねる
    const s = 96 / 64;
    const start = `translate(${150 - s * 90}px, ${184 - s * 136}px) scale(${s})`;
    const history = styles();
    expect(history.some((v) => v.includes(start))).toBe(true);
    // 最後は transform を外し、transition で動かす
    expect(flip.style.transform).toBe("");
    expect(flip.style.transition).toContain(`${PIE_FLIP_DURATION_MS}ms`);
  });

  it("同じ開閉状態のまま描き直されても動かさない", () => {
    const chart = fakeChart(NORMAL, boxes);
    const props = { chart, boxSize: { width: 300, height: 368 }, onFlip: () => {} };
    const { rerender } = render(<Harness {...props} isDetail={false} />);
    rerender(<Harness {...props} isDetail={false} />);
    expect(chart.resize).not.toHaveBeenCalled();
  });

  it("動いている間は入れ物へのタップを止め、終わったら戻す", () => {
    // 閉じた直後は背の高い入れ物が凡例にかぶさるので、凡例へのタップを円グラフ側で拾わないように
    vi.useFakeTimers();
    const chart = fakeChart(NORMAL, boxes);
    const { rerender, container } = render(
      <Harness
        chart={chart}
        isDetail={false}
        boxSize={{ width: 300, height: 368 }}
        onFlip={() => {}}
      />,
    );
    rerender(
      <Harness chart={chart} isDetail boxSize={{ width: 180, height: 272 }} onFlip={() => {}} />,
    );
    const box = container.firstElementChild as HTMLElement;
    expect(box.style.pointerEvents).toBe("none");

    vi.advanceTimersByTime(PIE_FLIP_DURATION_MS);
    expect(box.style.pointerEvents).toBe("");
  });

  it("表示されていなくて寸法を測れないときは、描き直さず何もしない", () => {
    const chart = fakeChart(NORMAL, boxes);
    const { rerender } = render(
      <Harness chart={chart} isDetail={false} boxSize={{ width: 300, height: 368 }} onFlip={() => {}} />,
    );
    rerender(
      <Harness chart={chart} isDetail boxSize={{ width: 0, height: 0 }} onFlip={() => {}} />,
    );
    expect(chart.resize).not.toHaveBeenCalled();
    expect(chart.stop).not.toHaveBeenCalled();
  });

  it("動きの途中で開閉し直したら、その時点の見た目から動かし始める", () => {
    const chart = fakeChart(NORMAL, boxes);
    let flip!: HTMLDivElement;
    const { rerender } = render(
      <Harness
        chart={chart}
        isDetail
        boxSize={{ width: 180, height: 272 }}
        onFlip={(el) => (flip = el)}
      />,
    );
    // 詳細表示の円で描かれていて、まだ半分の大きさ・(10,20)ずらした transform が残っている
    Object.assign(chart.arc, DETAIL);
    flip.style.transform = "matrix(0.5, 0, 0, 0.5, 10, 20)";

    const styles = watchStyle(flip);
    rerender(
      <Harness
        chart={chart}
        isDetail={false}
        boxSize={{ width: 300, height: 368 }}
        onFlip={(el) => (flip = el)}
      />,
    );

    // 見えていた円: 中心(10+0.5*90, 20+0.5*136)=(55,88)、半径 0.5*64=32
    const s = 32 / 96;
    const start = `translate(${55 - s * 150}px, ${88 - s * 184}px) scale(${s})`;
    expect(styles().some((v) => v.includes(start))).toBe(true);
  });
});
