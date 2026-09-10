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
    const text = buildUserStatPostText("『メガリザードンex』", stat);

    expect(text).toContain("『メガリザードンex』 の戦績");
    expect(text).toContain("勝率 57.4%（31勝23敗）");
    expect(text).toContain("対戦記録 18件 / 試合数 54戦");
  });

  // 集計条件の但し書きはポスト文に入れない(シェア画像の側に出してある)
  it("集計条件の断り書きは入れない", () => {
    const text = buildUserStatPostText("2026年7月", stat);

    expect(text).not.toContain("不戦勝");
  });
});

// デッキの戦績も、集計条件の但し書きは入れずに数字だけを載せる。
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

  it("デッキ名と勝率・戦績の要約を載せる", () => {
    const text = buildDeckSummaryPostText("メガリザードンex", deckStat);

    expect(text).toContain("『メガリザードンex』の戦績");
    expect(text).toContain("勝率 66.7%（12戦 8勝4敗）");
    expect(text).not.toContain("不戦勝");
  });

  it("対戦が無いデッキはデッキ名だけにする", () => {
    const text = buildDeckSummaryPostText("メガリザードンex", null);

    expect(text).toContain("『メガリザードンex』");
    expect(text).not.toContain("不戦勝");
  });
});
