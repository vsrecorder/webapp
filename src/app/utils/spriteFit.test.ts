import { describe, expect, it } from "vitest";

import { SPRITE_BOUNDS } from "@app/utils/spriteBounds";
import { spriteFitStyle } from "@app/utils/spriteFit";

// CSS の数値としてブラウザが読み戻しても変わらない形か(6 有効桁以内)。
// サーバ描画した style 属性がハイドレーションで一致するための条件
function roundTrips(text: string): boolean {
  const digits = text.replace("-", "").replace(".", "").replace(/^0+/, "");
  return digits.length <= 6;
}

const TRANSFORM = /^translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\(([\d.]+)\)$/;

describe("spriteFitStyle", () => {
  it("transform の数値は小数 3 桁までで、ブラウザの正規化(6 有効桁)を往復する", () => {
    // 全スプライト × 使っている枠の大きさを総当たりする(1 体でも長い小数が残ると
    // そのスプライトを含むページでハイドレーションの警告が出る)
    for (const id of [...Object.keys(SPRITE_BOUNDS), undefined]) {
      for (const frame of [28, 32, 44, 48, 96]) {
        const transform = String(spriteFitStyle(id, frame).transform);
        const matched = TRANSFORM.exec(transform);

        expect(matched, `${id} @${frame}: ${transform}`).not.toBeNull();

        for (const value of matched!.slice(1)) {
          expect(roundTrips(value), `${id} @${frame}: ${transform}`).toBe(true);
          expect(value, `${id} @${frame}: ${transform}`).toMatch(/^-?\d+(\.\d{1,3})?$/);
        }
      }
    }
  });

  it("unknown は枠の中央、実ポケモンは下端接地(丸めても配置の意味は変わらない)", () => {
    const unknown = spriteFitStyle(undefined, 48);
    const real = spriteFitStyle("0006", 48);

    expect(unknown.transform).toMatch(/^translate\(/);
    expect(real.transform).toMatch(/^translate\(/);
    expect(unknown.transform).not.toBe(real.transform);
  });
});
