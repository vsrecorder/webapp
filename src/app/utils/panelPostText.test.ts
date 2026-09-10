import { describe, expect, it } from "vitest";

import {
  buildDeckSummaryPostText,
  buildUserStatPostText,
} from "@app/utils/panelPostText";
import { UserStatType } from "@app/types/user_stat";

const stat = {
  user_id: "u1",
  year_month: "",
  environment_id: "",
  season: "",
  regulation_id: "1",
  total_records: 18,
  official_event_count: 7,
  tonamel_event_count: 2,
  unofficial_event_count: 3,
  total_matches: 54,
  wins: 31,
  losses: 23,
  win_rate: 0.574,
} satisfies UserStatType;

describe("buildUserStatPostText", () => {
  it("勝率と件数の要約を載せる", () => {
    const text = buildUserStatPostText("『メガリザードンex』", stat, false);

    expect(text).toContain("『メガリザードンex』 の戦績");
    expect(text).toContain("勝率 57.4%（31勝23敗）");
    expect(text).toContain("対戦記録 18件 / 試合数 54戦");
  });

  // 不戦勝・不戦敗を外した数字は公式のスイスドロー成績と一致しない。
  // ポスト文は数字だけが独り歩きするので、断り書きが落ちていないかを見る
  it("不戦勝・不戦敗を除いた数字なら断り書きを添える", () => {
    const text = buildUserStatPostText("2026年7月", stat, true);

    expect(text).toContain("2026年7月 の戦績（不戦勝・不戦敗を除く）");
  });

  it("含めた数字には断り書きを添えない", () => {
    const text = buildUserStatPostText("2026年7月", stat, false);

    expect(text).not.toContain("不戦勝");
  });
});

// デッキの戦績は常に不戦勝・不戦敗を外して集計しているので、シェア文でもその旨を断る。
// これが無いと、公式のスイスドロー成績と違う数字がそのまま外に出る。
describe("buildDeckSummaryPostText", () => {
  const deckStat = {
    deck_id: "d1",
    name: "メガリザードンex",
    count: 12,
    usage_rate: 0.4,
    wins: 8,
    losses: 4,
    win_rate: 0.6667,
    game_count: 0,
    go_first_count: 0,
    go_second_count: 0,
    go_first_rate: 0,
    go_first_wins: 0,
    go_first_win_rate: 0,
    go_second_wins: 0,
    go_second_win_rate: 0,
    pokemon_sprites: [],
  };

  it("勝率と戦績に不戦を除いた旨を添える", () => {
    const text = buildDeckSummaryPostText("メガリザードンex", deckStat);

    expect(text).toContain("『メガリザードンex』の戦績（不戦勝・不戦敗を除く）");
    expect(text).toContain("勝率 66.7%（12戦 8勝4敗）");
  });

  // 戦績が無ければ数字を出さないので、除外の断りも要らない
  it("対戦が無いデッキはデッキ名だけにする", () => {
    const text = buildDeckSummaryPostText("メガリザードンex", null);

    expect(text).toContain("『メガリザードンex』");
    expect(text).not.toContain("不戦勝・不戦敗");
  });
});
