import { describe, expect, it } from "vitest";

import { getSpriteBySlot, sortedSprites } from "@app/utils/spriteSlot";

describe("getSpriteBySlot", () => {
  it("position を持つデータは position 一致で枠を決める(配列の順序に依らない)", () => {
    const sprites = [
      { id: "0477", position: 2 },
      { id: "0887", position: 1 },
    ];

    expect(getSpriteBySlot(sprites, 1)?.id).toBe("0887");
    expect(getSpriteBySlot(sprites, 2)?.id).toBe("0477");
  });

  it("position を持たない旧データは配列の並びで枠を決める", () => {
    const sprites = [{ id: "0887" }, { id: "0477" }];

    expect(getSpriteBySlot(sprites, 1)?.id).toBe("0887");
    expect(getSpriteBySlot(sprites, 2)?.id).toBe("0477");
  });

  it("枠が埋まっていなければ undefined(呼び出し側が unknown を出す)", () => {
    expect(getSpriteBySlot([{ id: "0887", position: 1 }], 2)).toBeUndefined();
    expect(getSpriteBySlot([{ id: "0887" }], 2)).toBeUndefined();
    expect(getSpriteBySlot([], 1)).toBeUndefined();
    expect(getSpriteBySlot(null, 1)).toBeUndefined();
    expect(getSpriteBySlot(undefined, 1)).toBeUndefined();
  });
});

describe("sortedSprites", () => {
  it("position 順に並べ替え、元の配列は変えない", () => {
    const sprites = [
      { id: "0477", position: 2 },
      { id: "0887", position: 1 },
    ];

    expect(sortedSprites(sprites).map((s) => s.id)).toEqual(["0887", "0477"]);
    expect(sprites[0].id).toBe("0477");
  });

  it("旧データ(position なし)は元の並びのまま返す", () => {
    const sprites = [{ id: "b" }, { id: "a" }];

    expect(sortedSprites(sprites).map((s) => s.id)).toEqual(["b", "a"]);
    expect(sortedSprites(null)).toEqual([]);
  });
});
