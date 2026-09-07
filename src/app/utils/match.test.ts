import { describe, expect, it } from "vitest";

import { MatchGetResponseType } from "@app/types/match";
import { countMatchResults, summarizeMatches } from "@app/utils/match";

// テスト用の対戦(集計に関わるフラグだけ持つ)
const match = (flags: Partial<MatchGetResponseType>): MatchGetResponseType =>
  ({ victory_flg: false, draw_flg: false, group_match_flg: false, bo3_flg: false, ...flags }) as MatchGetResponseType;

describe("countMatchResults", () => {
  it("勝ち・引き分け以外を負けとして数える", () => {
    const result = countMatchResults([
      match({ victory_flg: true }),
      match({ draw_flg: true }),
      match({}),
      match({}),
    ]);
    expect(result).toEqual({ wins: 1, draws: 1, losses: 2, total: 4 });
  });
});

describe("summarizeMatches", () => {
  it("勝敗数とチーム戦・BO3の有無をまとめる", () => {
    expect(
      summarizeMatches([
        match({ victory_flg: true, bo3_flg: true }),
        match({ group_match_flg: true }),
      ]),
    ).toEqual({ total: 2, wins: 1, losses: 1, draws: 0, has_group_match: true, has_bo3: true });
  });

  it("対戦が無ければ全て 0 / false", () => {
    expect(summarizeMatches([])).toEqual({
      total: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      has_group_match: false,
      has_bo3: false,
    });
  });
});
