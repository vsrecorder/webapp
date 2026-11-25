import { describe, expect, it } from "vitest";

import {
  buildEventHeading,
  buildEventLabel,
  formatChampionsleagueWinner,
} from "@app/components/organisms/Championsleague/ChampionsleagueResultByLeague";

import { ChampionsleagueEventResultType } from "@app/types/championsleague_result";
import { ChampionsleagueScheduleType } from "@app/types/championsleague_schedule";
import { OfficialEventType } from "@app/types/official_event";

const winner = { player_id: "0038972010", player_name: "クリープ", rank: 1, deck_code: "a-1" };
const summary = {
  code: "a-1",
  total: 60,
  mainPokemon: ["メガドリュウズex", "ゲノセクトex"],
  aceSpec: null,
  groups: [],
};

describe("formatChampionsleagueWinner", () => {
  it("デッキ分類があれば「選手（分類名）」。型名は括弧で添える", () => {
    expect(
      formatChampionsleagueWinner(
        winner,
        { "a-1": summary },
        {
          "a-1": {
            deckCode: "a-1",
            archetypeName: "メガドリュウズex",
            variantName: "ゲノセクト型",
            label: "メガドリュウズex ゲノセクト型",
            sprites: ["0530_mega"],
          },
        },
      ),
    ).toBe("クリープ選手（メガドリュウズex(ゲノセクト型)）");
  });

  it("分類が無ければ主なポケモンで呼ぶ(旧シーズンの大会)", () => {
    expect(formatChampionsleagueWinner(winner, { "a-1": summary })).toBe(
      "クリープ選手（メガドリュウズex・ゲノセクトex）",
    );
  });

  it("どちらも無ければ選手名だけ", () => {
    expect(formatChampionsleagueWinner(winner, {})).toBe("クリープ選手");
  });
});

describe("buildEventHeading", () => {
  // 大会名は本番の official_events のもの
  it.each([
    [
      "チャンピオンズリーグ2026 大阪 シニアリーグ 1日目大会【2026年3月28日（土）開催】",
      "シニアリーグ 1日目大会",
    ],
    ["チャンピオンズリーグ2026 大阪 シニアリーグ 1日目大会", "シニアリーグ 1日目大会"],
    [
      "チャンピオンズリーグ2026 大阪 オープンリーグ【エクストラレギュレーション】",
      "オープンリーグ【エクストラレギュレーション】",
    ],
    ["チャンピオンズリーグ2026 大阪", "シニアリーグ"],
  ])("大会名と開催日の注記を落とす(%s)", (title, expected) => {
    expect(
      buildEventHeading(
        { title: "チャンピオンズリーグ2026 大阪 " } as ChampionsleagueScheduleType,
        { league_type: 3 } as ChampionsleagueEventResultType,
        { title } as OfficialEventType,
      ),
    ).toBe(expected);
  });
});

describe("buildEventLabel", () => {
  const date = new Date("2026-11-22T00:00:00+09:00");

  it.each([
    [3, "シニアリーグ 1日目大会", "1日目大会"],
    [2, "ジュニアリーグ 2日目大会", "2日目大会"],
    [4, "マスターリーグ グループA", "グループA"],
    [4, "マスターリーグDay2", "Day2"],
  ])("区分名を落とす(%i: %s)", (leagueType, heading, expected) => {
    expect(buildEventLabel(heading, { league_type: leagueType, date })).toBe(expected);
  });

  it.each(["シニアリーグ", "結果"])("区別できる語が残らなければ月日で呼ぶ(%s)", (heading) => {
    expect(buildEventLabel(heading, { league_type: 3, date })).toBe("11月22日");
  });
});
