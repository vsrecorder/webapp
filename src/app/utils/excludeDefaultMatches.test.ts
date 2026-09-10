import { describe, expect, it } from "vitest";

import {
  DEFAULT_EXCLUDE_DEFAULT_MATCHES,
  toExcludeDefaultMatches,
} from "@app/utils/excludeDefaultMatches";

describe("toExcludeDefaultMatches", () => {
  it("未保存(サーバ描画・読めない環境を含む)なら既定に従う", () => {
    expect(toExcludeDefaultMatches(null)).toBe(DEFAULT_EXCLUDE_DEFAULT_MATCHES);
  });

  // 既定は「不戦勝・不戦敗を除く」。サーバ描画の戦績もこの既定で取っており、
  // ここが食い違うとカードが毎回取り直しになる(utils/dashboardServer)。
  it("既定は除外する", () => {
    expect(DEFAULT_EXCLUDE_DEFAULT_MATCHES).toBe(true);
  });

  it('"false" のときだけ含める', () => {
    expect(toExcludeDefaultMatches("false")).toBe(false);
    expect(toExcludeDefaultMatches("true")).toBe(true);
  });

  // 想定外の値で「含める」側へ倒れると、利用者が触っていないのに数字が変わって見える
  it("壊れた値は既定として扱う", () => {
    expect(toExcludeDefaultMatches("")).toBe(true);
    expect(toExcludeDefaultMatches("1")).toBe(true);
  });
});
