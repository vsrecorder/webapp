import { describe, expect, it } from "vitest";

import {
  buildEventHeading,
  buildEventLabel,
  formatChampionsleagueWinner,
  formatHeadlineWinners,
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

describe("formatHeadlineWinners", () => {
  const schedule = { title: "チャンピオンズリーグ2027 千葉" } as ChampionsleagueScheduleType;

  function event(id: number, leagueType: number, date: string, playerName?: string) {
    return {
      official_event_id: id,
      league_type: leagueType,
      date: new Date(`${date}T00:00:00+09:00`),
      results: playerName
        ? [{ player_id: String(id), player_name: playerName, rank: 1, deck_code: `code-${id}` }]
        : [],
    } as unknown as ChampionsleagueEventResultType;
  }

  function titles(byId: Record<number, string>) {
    return Object.fromEntries(
      Object.entries(byId).map(([id, title]) => [
        id,
        { title: `${schedule.title} ${title}` } as OfficialEventType,
      ]),
    );
  }

  const senior = titles({ 1: "シニアリーグ 1日目大会", 2: "シニアリーグ 2日目大会" });

  it("1日目大会と2日目大会は両方の優勝を載せる。並びは渡した順によらず1日目が先", () => {
    expect(
      formatHeadlineWinners(
        schedule,
        [event(2, 3, "2026-11-23", "りょうすけ"), event(1, 3, "2026-11-22", "シュウスケ")],
        senior,
        { "code-1": { ...summary, code: "code-1" } },
      ),
    ).toBe(
      "優勝は、1日目大会がシュウスケ選手（メガドリュウズex・ゲノセクトex）、2日目大会がりょうすけ選手。",
    );
  });

  it("片方の優勝が無ければ、ある方だけを大会名付きで載せる", () => {
    expect(
      formatHeadlineWinners(
        schedule,
        [event(1, 3, "2026-11-22", "シュウスケ"), event(2, 3, "2026-11-23")],
        senior,
        {},
      ),
    ).toBe("優勝は、1日目大会がシュウスケ選手。");
  });

  it("大会が1つの区分は大会名を付けない", () => {
    expect(
      formatHeadlineWinners(schedule, [event(2, 3, "2026-11-23", "りょうすけ")], senior, {}),
    ).toBe("優勝はりょうすけ選手。");
  });

  it("予選の組と Day2 が並ぶ区分は最終日だけを載せる", () => {
    expect(
      formatHeadlineWinners(
        schedule,
        [event(1, 4, "2025-05-03", "グループの1位"), event(2, 4, "2025-05-04", "優勝者")],
        titles({ 1: "マスターリーグ グループA", 2: "マスターリーグ Day2" }),
        {},
      ),
    ).toBe("優勝は優勝者選手。");
  });

  it("大会名が引けなければ最終日だけを載せる", () => {
    expect(
      formatHeadlineWinners(
        schedule,
        [event(1, 3, "2026-11-22", "シュウスケ"), event(2, 3, "2026-11-23", "りょうすけ")],
        { 2: senior[2] },
        {},
      ),
    ).toBe("優勝はりょうすけ選手。");
  });

  it("優勝が無ければ空文字", () => {
    expect(formatHeadlineWinners(schedule, [], {}, {})).toBe("");
    expect(formatHeadlineWinners(schedule, [event(1, 3, "2026-11-22")], senior, {})).toBe("");
  });
});
