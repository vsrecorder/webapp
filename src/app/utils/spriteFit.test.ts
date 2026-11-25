import { describe, expect, it } from "vitest";

import { SPRITE_BOUNDS } from "@app/utils/spriteBounds";
import { spriteFitBox, spriteFitStyle } from "@app/utils/spriteFit";
import { SPRITE_HEIGHTS } from "@app/utils/spriteHeights";

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

// キャラ(アルファ境界)が枠の中で占める縦・横の大きさ(frame 比)
function characterSize(id: string, frame: number): { height: number; width: number } {
  const [cw, , , , bw, bh] = SPRITE_BOUNDS[id];
  const scale = spriteFitBox(id, frame).width / cw;

  return { height: (bh * scale) / frame, width: (bw * scale) / frame };
}

describe("図鑑の高さに応じた大きさ", () => {
  it("高いポケモンほど縦に大きく表示される", () => {
    // ピカチュウ 0.4m < ゲンガー 1.5m < リザードン 1.7m < ギャラドス 6.5m
    const ids = ["0025", "0094", "0006", "0130"];
    const heights = ids.map((id) => characterSize(id, 48).height);

    for (let i = 1; i < heights.length; i++) {
      expect(heights[i], `${ids[i - 1]} → ${ids[i]}`).toBeGreaterThan(heights[i - 1]);
    }
  });

  it("横に長いスプライトも縦の大きさで合わせる(リザードンがゲンガーより低くならない)", () => {
    // リザードンは横長(44x39)、ゲンガーは縦長(32x35)。長い方の辺で合わせると逆転する
    expect(characterSize("0006", 48).height).toBeGreaterThan(characterSize("0094", 48).height);
  });

  it("高さの差が見た目に出る(ピカチュウはリザードンの 8 割より小さい)", () => {
    expect(characterSize("0025", 48).height).toBeLessThan(characterSize("0006", 48).height * 0.8);
  });

  it("どのスプライトも枠からはみ出さない", () => {
    for (const id of Object.keys(SPRITE_BOUNDS)) {
      for (const frame of [28, 32, 44, 48, 96]) {
        const [cw, , bx, by, bw, bh] = SPRITE_BOUNDS[id];
        const box = spriteFitBox(id, frame);
        const scale = box.width / cw;
        const left = box.left + bx * scale;
        const top = box.top + by * scale;
        const eps = 1e-6;

        expect(left, `${id} @${frame}`).toBeGreaterThanOrEqual(-eps);
        expect(top, `${id} @${frame}`).toBeGreaterThanOrEqual(-eps);
        expect(left + bw * scale, `${id} @${frame}`).toBeLessThanOrEqual(frame + eps);
        expect(top + bh * scale, `${id} @${frame}`).toBeLessThanOrEqual(frame + eps);
      }
    }
  });
});

describe("高さの表(spriteHeights)", () => {
  it("枠合わせのデータがある全スプライトに高さがある", () => {
    const missing = Object.keys(SPRITE_BOUNDS).filter(
      (id) => id !== "unknown" && !(id in SPRITE_HEIGHTS),
    );

    expect(missing).toEqual([]);
  });

  it("キョダイマックス以外で 20m を超えるのはムゲンダイマックスだけ", () => {
    // 以前の生成方法では「ストリンダー ハイなすがた」(1.6m)がキョダイマックスの 24m に、
    // 「ウーラオス いちげきのかた」(1.9m)が 29m に取り違えられていた
    const giants = Object.entries(SPRITE_HEIGHTS)
      .filter(([id, height]) => !id.includes("gmax") && height > 20)
      .map(([id]) => id);

    expect(giants).toEqual(["0890_eternamax"]);
  });
});
