// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Chart } from "chart.js";

import {
  createPieSlicesSpritePlugin,
  getSpriteBadgeIndexAt,
  type PieSpriteDatasetProps,
} from "@app/utils/pieSlicesSpritePlugin";

// スプライト画像は読み込み済みとして扱う（実際には描かず、描画時の不透明度だけを見る）
class LoadedImage {
  complete = true;
  naturalWidth = 68;
  naturalHeight = 68;
  src = "";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
}

// chart.js の ArcElement のうち、プラグインが読む値だけを持つ偽物。
// drawn を渡すと「アニメーションの途中でここまで描かれている」状態を作れる。
function makeArc(startAngle: number, endAngle: number, drawn?: number) {
  const circumference = endAngle - startAngle;
  return {
    x: 150,
    y: 150,
    outerRadius: 80,
    startAngle,
    endAngle,
    circumference: drawn ?? circumference,
    getProps: () => ({ startAngle, endAngle, circumference }),
  };
}

type FakeArc = ReturnType<typeof makeArc>;

function makeChart(arcs: FakeArc[], props: PieSpriteDatasetProps) {
  const drawnAlphas: number[] = [];
  const ctx = {
    globalAlpha: 1,
    filter: "",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetY: 0,
    font: "",
    textAlign: "",
    textBaseline: "",
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    closePath() {},
    fill() {},
    stroke() {},
    fillText() {},
    drawImage() {
      drawnAlphas.push(ctx.globalAlpha);
    },
  };

  const canvas = document.createElement("canvas");
  document.body.appendChild(canvas);

  const chart = {
    id: 1,
    ctx,
    canvas,
    width: 300,
    height: 300,
    chartArea: { left: 50, right: 250, top: 50, bottom: 250 },
    data: { datasets: [props] },
    getDatasetMeta: () => ({ data: arcs }),
    draw() {},
  };

  return { chart: chart as unknown as Chart<"pie">, drawnAlphas };
}

// 画像はモジュール内のキャッシュで使い回されるため、テストごとに別のURLを使い、
// 「1回目の描画で読み込みが始まり、2回目から描かれる」流れを毎回同じにする
let urlSeq = 0;

function datasetProps(overrides: Partial<PieSpriteDatasetProps> = {}): PieSpriteDatasetProps {
  const n = urlSeq++;
  return {
    spriteUrls: [
      [`https://sprites.test/pokemon-sprites/${n}-a.png`],
      [`https://sprites.test/pokemon-sprites/${n}-b.png`],
    ],
    sliceColors: ["#006FEE", "#17C964"],
    percentTexts: [null, null],
    ...overrides,
  };
}

describe("createPieSlicesSpritePlugin", () => {
  beforeEach(() => {
    vi.stubGlobal("Image", LoadedImage);
  });

  it("入場アニメ（円弧が空から広がる）ではバッジも一緒に現れる", () => {
    const plugin = createPieSlicesSpritePlugin();
    // 入場の開始時点。両スライスとも円弧はまだ空
    const arcs = [makeArc(0, Math.PI, 0), makeArc(Math.PI, Math.PI * 2, 0)];
    const { chart, drawnAlphas } = makeChart(arcs, datasetProps());

    plugin.afterInit?.(chart, {} as never, {});
    plugin.afterUpdate?.(chart, {} as never, {});

    // 半分まで描けたところ。1回目の描画で画像の読み込みが始まり、2回目から実際に描かれる
    arcs.forEach((arc) => {
      arc.circumference = Math.PI / 2;
    });
    plugin.afterDatasetsDraw?.(chart, {} as never, {}, false);
    plugin.afterDatasetsDraw?.(chart, {} as never, {}, false);

    expect(drawnAlphas).toHaveLength(2);
    expect(drawnAlphas.every((alpha) => alpha > 0 && alpha < 1)).toBe(true);

    plugin.beforeDestroy?.(chart, {} as never, {});
  });

  it("既に描かれているスライスが更新で広がるだけのときは薄くならない", () => {
    const plugin = createPieSlicesSpritePlugin();
    // 更新前は 90 度ずつ。ここから 180 度ずつへ広がる途中（＝入場ではない）
    const arcs = [makeArc(0, Math.PI, Math.PI / 2), makeArc(Math.PI, Math.PI * 2, Math.PI / 2)];
    const { chart, drawnAlphas } = makeChart(arcs, datasetProps());

    plugin.afterInit?.(chart, {} as never, {});
    // afterUpdate の時点の円弧が「そのアニメーションの開始値」になる
    plugin.afterUpdate?.(chart, {} as never, {});

    plugin.afterDatasetsDraw?.(chart, {} as never, {}, false);
    plugin.afterDatasetsDraw?.(chart, {} as never, {}, false);

    expect(drawnAlphas).toHaveLength(2);
    // 描画の進み具合(0.5)を不透明度に使ってしまうと、データが入れ替わるたびに
    // 「割合が増えたスライスのバッジだけが薄くなって戻る」明滅になる
    expect(drawnAlphas.every((alpha) => alpha === 1)).toBe(true);

    plugin.beforeDestroy?.(chart, {} as never, {});
  });

  it("外周バッジの表示が戻ったフレームは、円の大きさが確定するまで描かない", () => {
    const plugin = createPieSlicesSpritePlugin();
    const arcs = [makeArc(0, Math.PI), makeArc(Math.PI, Math.PI * 2)];
    const props = datasetProps();
    const { chart, drawnAlphas } = makeChart(arcs, props);

    plugin.afterInit?.(chart, {} as never, {});
    plugin.afterUpdate?.(chart, {} as never, {});
    plugin.afterDatasetsDraw?.(chart, {} as never, {}, false);
    plugin.afterDatasetsDraw?.(chart, {} as never, {}, false);
    expect(drawnAlphas).toHaveLength(2);

    // 詳細カードを開く: 外周バッジを消す
    props.hideSliceBadges = true;
    plugin.afterDatasetsDraw?.(chart, {} as never, {}, false);
    expect(drawnAlphas).toHaveLength(2);
    expect(getSpriteBadgeIndexAt(chart, new MouseEvent("click"))).toBeNull();

    // 詳細カードを閉じる: 表示は即座に戻るが、キャンバスの幅と余白は CSS の
    // transition で遅れて追従するため、このフレームで描くと閉じる前の小さい円に
    // 合わせた位置・大きさのバッジが1フレームだけ現れてしまう
    props.hideSliceBadges = false;
    plugin.afterDatasetsDraw?.(chart, {} as never, {}, false);
    expect(drawnAlphas).toHaveLength(2);
    expect(getSpriteBadgeIndexAt(chart, new MouseEvent("click"))).toBeNull();

    plugin.beforeDestroy?.(chart, {} as never, {});
  });
});
