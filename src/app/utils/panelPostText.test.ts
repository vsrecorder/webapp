import { describe, expect, it } from "vitest";

import {
  buildDeckSummaryPostText,
  buildUserStatHistoryPostText,
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

  it("対戦がまだ無い期間は勝率の行を載せない", () => {
    // 0.0% と書くと全敗と読めてしまうので、件数だけにする
    const text = buildUserStatPostText("2026年9月", {
      ...stat,
      total_records: 0,
      total_matches: 0,
      wins: 0,
      losses: 0,
      win_rate: 0,
    });

    expect(text).toContain("2026年9月 の戦績");
    expect(text).toContain("対戦記録 0件 / 試合数 0戦");
    expect(text).not.toContain("勝率");
  });

  it("全敗の期間は勝率 0.0% を載せる(勝率が存在する)", () => {
    const text = buildUserStatPostText("2026年9月", {
      ...stat,
      total_records: 1,
      total_matches: 3,
      wins: 0,
      losses: 3,
      win_rate: 0,
    });

    expect(text).toContain("勝率 0.0%（0勝3敗）");
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

describe("buildUserStatHistoryPostText", () => {
  const month = (year_month: string, wins: number, losses: number) => ({
    year_month,
    total_matches: wins + losses,
    wins,
    losses,
    win_rate: wins + losses > 0 ? wins / (wins + losses) : 0,
  });

  it("月ごとの勝率と勝敗を古い順に並べる", () => {
    const text = buildUserStatHistoryPostText("直近3ヶ月", [
      month("2026-07", 5, 5),
      month("2026-08", 6, 4),
    ]);

    expect(text).toBe(
      ["直近3ヶ月", "", "7月 50.0%（5勝5敗）", "8月 60.0%（6勝4敗）", "", "#バトレコ"].join(
        "\n",
      ),
    );
  });

  it("勝ちも負けも無い月は勝率を「-」にする", () => {
    const text = buildUserStatHistoryPostText("直近3ヶ月", [month("2026-07", 0, 0)]);

    expect(text).toContain("7月 -（0勝0敗）");
  });

  it("載せるのは新しい6ヶ月まで。年は載せる月だけで判定する", () => {
    const months = [
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
    ].map((ym) => month(ym, 1, 1));
    const text = buildUserStatHistoryPostText("今シーズン", months);

    // 2025年12月は落ち、残りは同じ年なので月だけで書く
    expect(text).not.toContain("12月");
    expect(text).not.toContain("26/");
    expect(text).toContain("1月 50.0%");
    expect(text).toContain("6月 50.0%");
  });
});
