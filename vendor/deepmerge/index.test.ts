import { describe, expect, it } from "vitest";

import deepmerge from "./index.js";

// 攻撃側が送ってくる JSON を想定した入力。JSON.parse は __proto__ を own のキーとして作る。
const poisoned = () => JSON.parse('{"__proto__": {"isAdmin": true}}');

describe("deepmerge(GHSA-gcqx-w48m-w2h4 の修正)", () => {
  it("null プロトタイプの target でも、返り値のプロトタイプを差し替えられない", () => {
    const target = Object.create(null);
    target.role = "user";

    const merged = deepmerge(target, poisoned()) as Record<string, unknown>;

    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
    expect(merged.isAdmin).toBeUndefined();
    expect(merged.role).toBe("user");
  });

  it("null の値を持つ target の下でも、入れ子の返り値を汚せない", () => {
    const merged = deepmerge(
      { session: null },
      JSON.parse('{"session": {"__proto__": {"isAdmin": true}}}'),
    ) as unknown as { session: Record<string, unknown> };

    expect(Object.getPrototypeOf(merged.session)).toBe(Object.prototype);
    expect(merged.session.isAdmin).toBeUndefined();
  });

  it("own の __proto__ を持つ target からも、プロトタイプを持ち込めない", () => {
    const merged = deepmerge(poisoned(), { a: 1 }) as Record<string, unknown>;

    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
    expect(merged.isAdmin).toBeUndefined();
    expect(merged.a).toBe(1);
  });

  it("constructor / prototype のキーは捨てる", () => {
    const merged = deepmerge(
      {},
      JSON.parse('{"constructor": {"prototype": {"isAdmin": true}}, "prototype": 1, "ok": 2}'),
    ) as Record<string, unknown>;

    expect(Object.hasOwn(merged, "constructor")).toBe(false);
    expect(Object.hasOwn(merged, "prototype")).toBe(false);
    expect(merged.ok).toBe(2);
  });

  it("Object.prototype そのものも汚さない", () => {
    deepmerge({}, poisoned());
    deepmerge(Object.create(null), poisoned());

    expect(({} as Record<string, unknown>).isAdmin).toBeUndefined();
  });
});

// @heroui/theme がテーマの色・レイアウトを既定値と合成するのに使っている。
// 修正で普段の動きが変わっていないことを確かめる。
describe("deepmerge(原本と同じ動き)", () => {
  it("入れ子のオブジェクトを合成し、後ろの値で上書きする", () => {
    const base = { primary: { 50: "#a", DEFAULT: "#b" }, focus: { DEFAULT: "#c" } };
    const merged = deepmerge(base, { primary: { DEFAULT: "#x", foreground: "#fff" } });

    expect(merged).toEqual({
      primary: { 50: "#a", DEFAULT: "#x", foreground: "#fff" },
      focus: { DEFAULT: "#c" },
    });
    // 入力は書き換えず、複製を返す
    expect(base.primary.DEFAULT).toBe("#b");
    expect(merged.focus).not.toBe(base.focus);
  });

  it("書き込んだプロパティは普通の代入と同じ性質を持つ", () => {
    const merged = deepmerge({ a: 1 }, { b: 2 });

    expect(Object.getOwnPropertyDescriptor(merged, "a")).toEqual({
      value: 1,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    expect(Object.keys(merged)).toEqual(["a", "b"]);
    expect(JSON.stringify(merged)).toBe('{"a":1,"b":2}');
  });

  it("配列は結合し、arrayMerge・clone・customMerge・all のオプションも効く", () => {
    expect(deepmerge({ xs: [1] }, { xs: [2] })).toEqual({ xs: [1, 2] });
    expect(
      deepmerge({ xs: [1] }, { xs: [2] }, { arrayMerge: (_t, s) => s }),
    ).toEqual({ xs: [2] });

    const inner = { v: 1 };
    expect(deepmerge({}, { inner }, { clone: false }).inner).toBe(inner);

    expect(
      deepmerge(
        { n: { a: 1 } },
        { n: { b: 2 } },
        { customMerge: (key) => (key === "n" ? (_x, y) => y : undefined) },
      ),
    ).toEqual({ n: { b: 2 } });

    expect(deepmerge.all([{ a: 1 }, { b: 2 }, { a: 3 }])).toEqual({ a: 3, b: 2 });
  });

  it("シンボルのキーと Date・RegExp の値は原本どおり扱う", () => {
    const sym = Symbol("s");
    const date = new Date(0);
    const merged = deepmerge({ [sym]: 1 }, { d: date, r: /x/ }) as Record<
      string | symbol,
      unknown
    >;

    expect(merged[sym]).toBe(1);
    expect(merged.d).toBe(date);
    expect(merged.r).toBeInstanceOf(RegExp);
  });
});
