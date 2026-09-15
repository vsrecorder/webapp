import { describe, expect, it } from "vitest";

import { deckFingerprintKey, fingerprintKey } from "@app/utils/fingerprint";

describe("fingerprintKey", () => {
  it("重複を除いて昇順で連結する(集計側と同じ順序)", () => {
    expect(fingerprintKey(["0018", "0006", "0006"])).toBe("0006,0018");
  });

  it("スプライトが無ければ空文字", () => {
    expect(fingerprintKey([])).toBe("");
  });
});

describe("deckFingerprintKey", () => {
  const sprites = [
    { id: "0018", position: 2 },
    { id: "0006", position: 1 },
  ];

  it("組み合わせ別は2枠のスプライト全部で決まる", () => {
    expect(deckFingerprintKey(sprites, "exact")).toBe("0006,0018");
  });

  it("1体目でまとめると1体目だけで決まる", () => {
    expect(deckFingerprintKey(sprites, "first_sprite")).toBe("0006");
    // 2体目が違うだけの派生は同じ指紋になる
    expect(
      deckFingerprintKey(
        [
          { id: "0006", position: 1 },
          { id: "0025", position: 2 },
        ],
        "first_sprite",
      ),
    ).toBe("0006");
  });

  it("1枠目が欠けていても2枠目を1体目として扱う", () => {
    // position==1 で抜き出すと指紋なしになり、票ごと落ちてしまう
    expect(deckFingerprintKey([{ id: "0018", position: 2 }], "first_sprite")).toBe("0018");
  });

  it("position を持たない旧データは配列の並びを枠の順とみなす", () => {
    expect(deckFingerprintKey([{ id: "0018" }, { id: "0006" }], "first_sprite")).toBe(
      "0018",
    );
    expect(deckFingerprintKey([{ id: "0018" }, { id: "0006" }], "exact")).toBe(
      "0006,0018",
    );
  });

  it("3体目以降は指紋に入れない(画面にも出ないため)", () => {
    const withThird = [
      { id: "0006", position: 1 },
      { id: "0018", position: 2 },
      { id: "0025", position: 3 },
    ];
    expect(deckFingerprintKey(withThird, "exact")).toBe("0006,0018");
  });

  it("スプライトが無ければ空文字(「その他」と同値なので呼び出し側で弾く)", () => {
    expect(deckFingerprintKey([], "exact")).toBe("");
    expect(deckFingerprintKey(undefined, "first_sprite")).toBe("");
  });
});
