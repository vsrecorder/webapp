import { describe, expect, it } from "vitest";

import {
  formatLeagueDates,
  groupEventsByLeagueType,
  leagueSlugFromType,
} from "@app/utils/championsleague";

// core-apiserver が返す形（リーグ区分 × Day のイベント）。テストに要るのは2つの列だけ。
function event(leagueType: number, date: string) {
  return { league_type: leagueType, date: new Date(date) };
}

describe("groupEventsByLeagueType", () => {
  it("1日目と2日目が別イベントの区分を1つにまとめる", () => {
    // チャンピオンズリーグ2026 大阪。シニアとジュニアが3/28と3/29に分かれている。
    const groups = groupEventsByLeagueType([
      event(4, "2026-03-29T00:00:00+09:00"),
      event(3, "2026-03-29T00:00:00+09:00"),
      event(2, "2026-03-29T00:00:00+09:00"),
      event(3, "2026-03-28T00:00:00+09:00"),
      event(2, "2026-03-28T00:00:00+09:00"),
    ]);

    expect(groups.map((group) => group.leagueType)).toEqual([4, 3, 2]);
    expect(groups.map((group) => group.events.length)).toEqual([1, 2, 2]);
  });

  it("区分の中は開催日の古い順に並べる（1日目が先）", () => {
    const groups = groupEventsByLeagueType([
      event(3, "2026-03-29T00:00:00+09:00"),
      event(3, "2026-03-28T00:00:00+09:00"),
    ]);

    expect(groups[0].events.map((e) => e.date.toISOString())).toEqual([
      new Date("2026-03-28T00:00:00+09:00").toISOString(),
      new Date("2026-03-29T00:00:00+09:00").toISOString(),
    ]);
  });

  it("区分はマスター → シニア → ジュニア → オープンの順に並べる", () => {
    const groups = groupEventsByLeagueType([
      event(1, "2026-03-29T00:00:00+09:00"),
      event(2, "2026-03-29T00:00:00+09:00"),
      event(4, "2026-03-29T00:00:00+09:00"),
      event(3, "2026-03-29T00:00:00+09:00"),
    ]);

    expect(groups.map((group) => group.slug)).toEqual([
      "master",
      "senior",
      "junior",
      "open",
    ]);
  });

  it("未知の区分は末尾に送り、スラッグは空にする（呼び出し側で落とせる）", () => {
    const groups = groupEventsByLeagueType([
      event(9, "2026-03-29T00:00:00+09:00"),
      event(4, "2026-03-29T00:00:00+09:00"),
    ]);

    expect(groups.map((group) => group.leagueType)).toEqual([4, 9]);
    expect(groups[1].slug).toBe("");
    expect(leagueSlugFromType(9)).toBe("");
  });

  it("同じ日に2イベントある区分も取りこぼさない", () => {
    // チャンピオンズリーグ2025 愛知のマスターは 5/3 に3イベントある。
    const groups = groupEventsByLeagueType([
      event(4, "2025-05-04T00:00:00+09:00"),
      event(4, "2025-05-03T00:00:00+09:00"),
      event(4, "2025-05-03T00:00:00+09:00"),
      event(4, "2025-05-03T00:00:00+09:00"),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].events).toHaveLength(4);
  });

  it("入力の配列を書き換えない", () => {
    const events = [
      event(3, "2026-03-29T00:00:00+09:00"),
      event(3, "2026-03-28T00:00:00+09:00"),
    ];
    const before = events.map((e) => e.date.toISOString());

    groupEventsByLeagueType(events);

    expect(events.map((e) => e.date.toISOString())).toEqual(before);
  });
});

describe("formatLeagueDates", () => {
  it("1日だけなら年から出す", () => {
    expect(formatLeagueDates([new Date("2026-03-29T00:00:00+09:00")])).toBe(
      "2026年3月29日",
    );
  });

  it("2日に分かれた区分は、2日目以降を月日だけで繋ぐ", () => {
    expect(
      formatLeagueDates([
        new Date("2026-03-29T00:00:00+09:00"),
        new Date("2026-03-28T00:00:00+09:00"),
      ]),
    ).toBe("2026年3月28日・3月29日");
  });

  it("イベントが無ければ空文字", () => {
    expect(formatLeagueDates([])).toBe("");
  });
});
