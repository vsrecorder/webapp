import { describe, expect, it } from "vitest";

import {
  DECK_USAGE_ALL_TIME_QUERY,
  EXCLUDE_DEFAULT_MATCHES_QUERY,
  DEFAULT_EXCLUDE_DEFAULT_MATCHES,
  parseExcludeDefaultMatchesCookie,
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

// デッキの戦績とふりかえりは、利用者の設定に依らず常に不戦を外して引く。
// この条件が欠けると、勝率が黙って別物(不戦込み)に変わる。
describe("EXCLUDE_DEFAULT_MATCHES_QUERY", () => {
  // デッキ使用率分析パネルは、これを初期値にした URLSearchParams へ期間などを足していく
  it("URLSearchParams に渡すと除外指定になる", () => {
    const params = new URLSearchParams(EXCLUDE_DEFAULT_MATCHES_QUERY);

    expect(params.get("exclude_default_matches")).toBe("true");
  });
});

describe("DECK_USAGE_ALL_TIME_QUERY", () => {
  it("全期間かつ不戦勝・不戦敗を除く条件になっている", () => {
    const params = new URLSearchParams(DECK_USAGE_ALL_TIME_QUERY);

    expect(params.get("all_time")).toBe("true");
    expect(params.get("exclude_default_matches")).toBe("true");
  });
});

/*
 * cookie はサーバへ設定を見せるための写し。誰でも書き換えられるので、
 * 期待した値以外は「無い」(=既定に従う)として扱う。
 */
describe("parseExcludeDefaultMatchesCookie", () => {
  it("true / false を解釈する", () => {
    expect(parseExcludeDefaultMatchesCookie("true")).toBe(true);
    expect(parseExcludeDefaultMatchesCookie("false")).toBe(false);
  });

  it("未設定や想定外の値は null にする", () => {
    expect(parseExcludeDefaultMatchesCookie(undefined)).toBeNull();
    expect(parseExcludeDefaultMatchesCookie(null)).toBeNull();
    expect(parseExcludeDefaultMatchesCookie("")).toBeNull();
    expect(parseExcludeDefaultMatchesCookie("1")).toBeNull();
  });
});
