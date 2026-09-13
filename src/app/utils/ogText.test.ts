import { describe, expect, it } from "vitest";

import { deckNameFontSize, textWidthEm } from "@app/utils/ogText";

// OGP のデッキ名は枠幅 500px(スプライトあり) / 1056px(スプライトなし)で描く
const WIDTH = 500;
const MAX = 52;

describe("textWidthEm", () => {
  it("かな・漢字は1文字=1em", () => {
    expect(textWidthEm("レシリザ")).toBe(4);
    expect(textWidthEm("溶岩洞")).toBe(3);
  });

  it("半角は文字種ごとの幅で数える", () => {
    expect(textWidthEm("ex")).toBeCloseTo(1.04);
    expect(textWidthEm("EX")).toBeCloseTo(1.3);
    expect(textWidthEm("2")).toBeCloseTo(0.6);
    expect(textWidthEm("+")).toBeCloseTo(0.55);
  });

  // 実際に描画して測った幅(fontSize=100 で 1661px = 16.61em)との差が数%に収まること
  it("実測幅と数%以内で一致する", () => {
    expect(textWidthEm("溶岩洞メガレックウザ+ジュペッタex")).toBeCloseTo(16.61, 1);
  });

  it("空文字は0", () => {
    expect(textWidthEm("")).toBe(0);
  });
});

describe("deckNameFontSize", () => {
  it("短い名前は上限のサイズで表示する", () => {
    expect(deckNameFontSize("レシリザ", WIDTH, MAX)).toBe(MAX);
  });

  it("長い名前は枠に収まるまで小さくする", () => {
    const name = "メガヘラクロスノココッチex";
    const size = deckNameFontSize(name, WIDTH, MAX);

    expect(size).toBeLessThan(MAX);
    expect(textWidthEm(name) * size).toBeLessThanOrEqual(WIDTH);
  });

  // 概算が実測をわずかに下回る場合でも、安全率の分で枠に収まる
  it("実測幅で枠に収まるサイズを返す", () => {
    const measuredEm = 16.61;
    const size = deckNameFontSize("溶岩洞メガレックウザ+ジュペッタex", WIDTH, MAX);

    expect(measuredEm * size).toBeLessThanOrEqual(WIDTH);
  });

  it("下限を下回らない(収まらない長さは呼び出し側で省略する)", () => {
    const name = "ものすごくながいなまえのデッキメガレックウザジュペッタサーナイトルギアミライドン";

    expect(deckNameFontSize(name, WIDTH, MAX)).toBe(28);
  });

  it("スプライトが無い投稿は枠が広く、より大きく表示できる", () => {
    const name = "メガヘラクロスノココッチex";

    expect(deckNameFontSize(name, 1056, 64)).toBe(64);
  });

  it("名前が空でも下限より小さくならない", () => {
    expect(deckNameFontSize("", WIDTH, MAX)).toBe(MAX);
  });
});
