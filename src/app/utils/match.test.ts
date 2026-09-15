import { describe, expect, it } from "vitest";

import { MatchGetResponseType } from "@app/types/match";
import { countMatchResults, hasPrizeCards, summarizeMatches } from "@app/utils/match";

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
    ).toEqual({
      total: 2,
      wins: 1,
      losses: 1,
      draws: 0,
      has_group_match: true,
      has_bo3: true,
      last_match_at: null,
    });
  });

  it("対戦が無ければ全て 0 / false", () => {
    expect(summarizeMatches([])).toEqual({
      total: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      has_group_match: false,
      has_bo3: false,
      last_match_at: null,
    });
  });

  // ホームの「記録中」カードが最後に手が動いた時刻として使う。
  // 過去の対戦を後から足せるので、並び順ではなく最大値を取る
  it("最後に作られた対戦の作成日時を返す", () => {
    const summary = summarizeMatches([
      match({ created_at: "2026-09-15T03:05:00Z" as unknown as Date }),
      match({ created_at: "2026-09-15T01:20:00Z" as unknown as Date }),
    ]);

    expect(summary.last_match_at).toBe("2026-09-15T03:05:00.000Z");
  });
});

describe("hasPrizeCards", () => {
  it("0 - 0 は未入力とみなして表示しない", () => {
    expect(hasPrizeCards(0, 0)).toBe(false);
  });

  it("どちらかが 0 以外なら表示する", () => {
    expect(hasPrizeCards(6, 0)).toBe(true);
    expect(hasPrizeCards(0, 6)).toBe(true);
    expect(hasPrizeCards(2, 3)).toBe(true);
  });

  it("null / undefined は 0 として扱う", () => {
    expect(hasPrizeCards(null, null)).toBe(false);
    expect(hasPrizeCards(undefined, undefined)).toBe(false);
    expect(hasPrizeCards(null, 4)).toBe(true);
  });
});
