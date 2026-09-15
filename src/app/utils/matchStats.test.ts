import { describe, expect, it } from "vitest";

import { summarizeMatches } from "@app/utils/matchStats";

import { hasWinRate } from "@app/utils/winRate";

import { MatchGetResponseType } from "@app/types/match";

// 集計に効くフラグだけを持つ対戦。summarizeMatches は他の項目を見ない
const match = (flags: Partial<MatchGetResponseType>) =>
  ({
    victory_flg: false,
    draw_flg: false,
    group_match_flg: false,
    group_match_victory_flg: false,
    ...flags,
  }) as unknown as MatchGetResponseType;

// 集計(summarizeMatches)の結果が「勝率を持つか」の判定とかみ合うか
describe("summarizeMatches と hasWinRate", () => {
  it("対戦が1件も無ければ勝率を持たない", () => {
    const stats = summarizeMatches([]);
    expect(hasWinRate(stats.wins, stats.losses)).toBe(false);
  });

  it("引き分けだけなら勝率を持たない", () => {
    // 勝率は引き分けを分母から外す(勝ち/(勝ち+負け))ので、決着した対戦が無い
    const stats = summarizeMatches([match({ draw_flg: true }), match({ draw_flg: true })]);

    expect(stats.total).toBe(2);
    expect(stats.winRate).toBe(0);
    expect(hasWinRate(stats.wins, stats.losses)).toBe(false);
  });

  it("勝ちか負けが1件でもあれば勝率を持つ", () => {
    const win = summarizeMatches([match({ victory_flg: true })]);
    expect(hasWinRate(win.wins, win.losses)).toBe(true);

    // 引き分け混じりでも決着があれば算出できる
    const mixed = summarizeMatches([match({ draw_flg: true }), match({ victory_flg: true })]);
    expect(hasWinRate(mixed.wins, mixed.losses)).toBe(true);
  });
});
