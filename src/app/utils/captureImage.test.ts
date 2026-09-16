// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { getCaptureStyleProperties, inlineSvgVarPaints } from "@app/utils/captureImage";

/*
 * jsdom の getComputedStyle は SVG の塗り(fill / stroke)を解決しないため、
 * 実ブラウザの計算値の代わりに固定値を返させる。
 * キーは「プロパティ名」で、値はそのプロパティの計算値。
 */
function mockComputedStyle(values: Record<string, string>) {
  vi.spyOn(window, "getComputedStyle").mockImplementation(
    () =>
      ({
        getPropertyValue: (prop: string) => values[prop] ?? "",
      }) as unknown as CSSStyleDeclaration,
  );
}

function render(html: string): HTMLElement {
  document.body.innerHTML = `<div id="root">${html}</div>`;
  return document.getElementById("root") as HTMLElement;
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("inlineSvgVarPaints", () => {
  it("CSS変数で書かれた stroke を計算済みの値へ置き換える", () => {
    mockComputedStyle({ stroke: "rgba(243, 18, 96, 0.15)" });
    const root = render(
      `<svg><circle stroke="hsl(var(--heroui-danger) / 0.15)"></circle></svg>`,
    );

    inlineSvgVarPaints(root);

    const circle = root.querySelector("circle") as SVGElement;
    expect(circle.style.stroke).toBe("rgba(243, 18, 96, 0.15)");
  });

  it("インラインスタイル側に書かれた CSS変数も置き換える", () => {
    mockComputedStyle({ fill: "rgb(23, 201, 100)" });
    const root = render(`<svg><path style="fill: hsl(var(--heroui-success))"></path></svg>`);

    inlineSvgVarPaints(root);

    expect((root.querySelector("path") as SVGElement).style.fill).toBe(
      "rgb(23, 201, 100)",
    );
  });

  // グラデーション参照(kizuna の fill="url(#…)")のような、書き出しでもそのまま
  // 通る指定にまで触ると、壊す危険だけが増える
  it("CSS変数を含まない塗りには触らない", () => {
    mockComputedStyle({ fill: "rgb(0, 0, 0)", stroke: "rgb(0, 0, 0)" });
    const root = render(
      `<svg><rect fill="url(#grad)"></rect><rect stroke="currentColor"></rect></svg>`,
    );

    inlineSvgVarPaints(root);

    const [byUrl, byCurrentColor] = Array.from(root.querySelectorAll("rect"));
    expect(byUrl.style.fill).toBe("");
    expect(byUrl.getAttribute("fill")).toBe("url(#grad)");
    expect(byCurrentColor.style.stroke).toBe("");
  });

  // 計算値が取れない状況(DOMへ入れる前に呼ばれた等)で空に上書きすると、
  // 直すつもりが色を消してしまう
  it("計算値が取れないときは元の指定を残す", () => {
    mockComputedStyle({});
    const root = render(`<svg><circle stroke="hsl(var(--heroui-danger))"></circle></svg>`);

    inlineSvgVarPaints(root);

    const circle = root.querySelector("circle") as SVGElement;
    expect(circle.style.stroke).toBe("");
    expect(circle.getAttribute("stroke")).toBe("hsl(var(--heroui-danger))");
  });

  it("SVGの外のHTML要素は対象にしない", () => {
    mockComputedStyle({ fill: "rgb(1, 2, 3)" });
    const root = render(`<div style="fill: hsl(var(--heroui-danger))"></div>`);

    inlineSvgVarPaints(root);

    const div = root.querySelector("div") as HTMLElement;
    expect(div.style.fill).toBe("hsl(var(--heroui-danger))");
  });
});

// 一覧はモジュール内に1つだけ持つ(描画ライブラリ側も1回で確定させるため)。
// そのため、この describe より前に getCaptureStyleProperties を呼ぶテストは足さないこと。
describe("getCaptureStyleProperties", () => {
  // 書き出しでコピーするプロパティの一覧。カスタムプロパティは inlineSvgVarPaints で
  // 解決済みにしてあるぶん不要で、全要素へ写すと書き出しが重くなる
  it("カスタムプロパティを除いた一覧を返し、2回目は同じ配列を使い回す", () => {
    const enumerated = Object.assign(
      { length: 4 },
      { 0: "color", 1: "--heroui-danger", 2: "stroke", 3: "--tw-rotate" },
    );
    const spy = vi
      .spyOn(window, "getComputedStyle")
      .mockReturnValue(enumerated as unknown as CSSStyleDeclaration);

    const first = getCaptureStyleProperties();
    expect(first).toEqual(["color", "stroke"]);

    // 描画ライブラリ側も一覧を1回だけ確定させるため、こちらも作り直さない
    const second = getCaptureStyleProperties();
    expect(second).toBe(first);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
