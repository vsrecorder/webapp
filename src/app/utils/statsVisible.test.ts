import { describe, expect, it } from "vitest";

import {
  DEFAULT_STATS_VISIBLE,
  STATS_VISIBLE_COOKIE,
  STATS_VISIBLE_KEY,
  parseStatsVisibleCookie,
} from "@app/utils/statsVisible";
import {
  EXCLUDE_DEFAULT_MATCHES_COOKIE,
  EXCLUDE_DEFAULT_MATCHES_KEY,
} from "@app/utils/excludeDefaultMatches";

describe("statsVisible", () => {
  // 既定は表示。伏せている人だけが "false" を保存する
  it("既定は表示", () => {
    expect(DEFAULT_STATS_VISIBLE).toBe(true);
  });

  /*
   * cookie はサーバへ設定を見せるための写し。誰でも書き換えられるので、
   * 期待した値以外は「無い」(=既定に従う)として扱う。
   */
  /*
   * 同じカードに並ぶ2つの設定(戦績の表示/非表示と、不戦勝・不戦敗の除外)は
   * 作りが同じで、保存先を取り違えても型では気づけない。
   * 取り違えると片方のトグルがもう片方を切り替えてしまうので、別物であることを見張る。
   */
  it("不戦勝・不戦敗の設定とは保存先を共有しない", () => {
    expect(STATS_VISIBLE_KEY).not.toBe(EXCLUDE_DEFAULT_MATCHES_KEY);
    expect(STATS_VISIBLE_COOKIE).not.toBe(EXCLUDE_DEFAULT_MATCHES_COOKIE);
  });

  it("true / false を解釈し、それ以外は null にする", () => {
    expect(parseStatsVisibleCookie("true")).toBe(true);
    expect(parseStatsVisibleCookie("false")).toBe(false);
    expect(parseStatsVisibleCookie(undefined)).toBeNull();
    expect(parseStatsVisibleCookie(null)).toBeNull();
    expect(parseStatsVisibleCookie("")).toBeNull();
    expect(parseStatsVisibleCookie("1")).toBeNull();
  });
});
