import { describe, expect, it } from "vitest";

import { CityleagueResultType } from "@app/types/cityleague_result";
import {
  DECK_ARCHETYPE_CODES_PER_REQUEST,
  chunkDeckCodes,
  collectListedDeckCodes,
  deckArchetypeToDeckDraft,
  deckDisplayName,
  isDeckArchetypeChampionsleague,
  isDeckArchetypeSeason,
  normalizeDeckCodes,
  parseDeckArchetypeResponse,
  seasonYearOfScheduleId,
} from "@app/utils/deckArchetype";

function eventResult(
  scheduleId: string,
  results: { rank: number; deck_code: string }[],
): CityleagueResultType {
  return {
    cityleague_schedule_id: scheduleId,
    official_event_id: 1,
    league_type: 1,
    date: new Date("2026-09-26"),
    event_detail_result_url: "",
    results: results.map((r, index) => ({
      player_id: String(index),
      player_name: `選手${index}`,
      point: 0,
      ...r,
    })),
  };
}

describe("seasonYearOfScheduleId / isDeckArchetypeSeason", () => {
  it("シーズン ID から年を読む", () => {
    expect(seasonYearOfScheduleId("2027s1")).toBe(2027);
    expect(seasonYearOfScheduleId("2026s4")).toBe(2026);
    expect(seasonYearOfScheduleId("2028s12")).toBe(2028);
  });

  it("形が違えば null", () => {
    expect(seasonYearOfScheduleId("")).toBeNull();
    expect(seasonYearOfScheduleId(undefined)).toBeNull();
    expect(seasonYearOfScheduleId("s1")).toBeNull();
    expect(seasonYearOfScheduleId("2027")).toBeNull();
  });

  it("2027 シーズン以降だけ分類が付く", () => {
    expect(isDeckArchetypeSeason("2027s1")).toBe(true);
    expect(isDeckArchetypeSeason("2028s1")).toBe(true);
    expect(isDeckArchetypeSeason("2026s4")).toBe(false);
    expect(isDeckArchetypeSeason(null)).toBe(false);
  });
});

describe("collectListedDeckCodes", () => {
  it("一覧に載る入賞(8位まで)のデッキコードを、2027 シーズン以降のイベントから重複なく集める", () => {
    const codes = collectListedDeckCodes([
      eventResult("2027s1", [
        { rank: 1, deck_code: "AAAAAA-111111-AAAAAA" },
        { rank: 5, deck_code: "BBBBBB-222222-BBBBBB" },
        // 9位以下は一覧に載らないので引かない
        { rank: 9, deck_code: "CCCCCC-333333-CCCCCC" },
        // デッキ未登録
        { rank: 5, deck_code: "" },
      ]),
      eventResult("2027s1", [
        // 別の大会で同じコード
        { rank: 1, deck_code: "AAAAAA-111111-AAAAAA" },
      ]),
      // 提供範囲より前のシーズン
      eventResult("2026s4", [{ rank: 1, deck_code: "DDDDDD-444444-DDDDDD" }]),
    ]);

    expect(codes).toEqual(["AAAAAA-111111-AAAAAA", "BBBBBB-222222-BBBBBB"]);
  });
});

describe("normalizeDeckCodes / chunkDeckCodes", () => {
  it("形の正しいコードだけを重複なく辞書順に並べる", () => {
    expect(normalizeDeckCodes([" b-2 ", "a-1", "b-2", "", "bad code", "../x"])).toEqual([
      "a-1",
      "b-2",
    ]);
  });

  it("同じ組み合わせなら順序が違っても同じ塊に分かれる", () => {
    const codes = Array.from({ length: 250 }, (_, i) => `code-${String(i).padStart(3, "0")}`);
    const shuffled = [...codes].reverse();

    const chunks = chunkDeckCodes(normalizeDeckCodes(shuffled));

    expect(chunks.map((c) => c.length)).toEqual([100, 100, 50]);
    expect(chunks).toEqual(chunkDeckCodes(normalizeDeckCodes(codes)));
    expect(DECK_ARCHETYPE_CODES_PER_REQUEST).toBe(100);
  });

  it("空なら塊も無い", () => {
    expect(chunkDeckCodes([])).toEqual([]);
  });
});

describe("parseDeckArchetypeResponse", () => {
  const classified = {
    deckCode: "kfwFfb-NhLBlj-fdVkbF",
    environmentId: "m6a",
    eventDate: "2026-09-26",
    archetypeId: "dragapult",
    archetypeName: "ドラパルトex",
    variantId: "blaziken",
    variantName: "バシャーモ型",
    label: "ドラパルトex バシャーモ型",
    sprites: ["0887", "0257"],
    spriteUrls: ["https://example.test/887.png", "https://example.test/257.png"],
  };
  const unclassified = {
    deckCode: "nLngnQ-Gn8M3U-9n6Hgg",
    environmentId: "m6a",
    eventDate: "2026-09-26",
    archetypeId: null,
    archetypeName: null,
    variantId: null,
    variantName: null,
    label: null,
    sprites: [],
    spriteUrls: [],
  };

  it("表示に使う項目だけを取り出し、未分類も残す", () => {
    const map = parseDeckArchetypeResponse({
      rulesVersion: "m6a-v1",
      decks: { [classified.deckCode]: classified, [unclassified.deckCode]: unclassified },
      notFound: ["zzzzzz-zzzzzz-zzzzzz"],
    });

    expect(map).toEqual({
      [classified.deckCode]: {
        deckCode: classified.deckCode,
        archetypeName: "ドラパルトex",
        variantName: "バシャーモ型",
        label: "ドラパルトex バシャーモ型",
        sprites: ["0887", "0257"],
      },
      [unclassified.deckCode]: {
        deckCode: unclassified.deckCode,
        archetypeName: null,
        variantName: null,
        label: null,
        sprites: [],
      },
    });
    // 索引に無いコードは入らない
    expect(map["zzzzzz-zzzzzz-zzzzzz"]).toBeUndefined();
  });

  it("形の違う項目や応答は捨てる", () => {
    expect(parseDeckArchetypeResponse(null)).toEqual({});
    expect(parseDeckArchetypeResponse({ error: "x" })).toEqual({});
    expect(parseDeckArchetypeResponse({ decks: [] })).toEqual({});

    const map = parseDeckArchetypeResponse({
      decks: {
        "ok-1": { ...classified, deckCode: "ok-1", sprites: ["0006", 7, null] },
        "bad-1": { label: 1 },
        "bad-2": "string",
        "bad code": classified,
      },
    });

    expect(Object.keys(map)).toEqual(["ok-1"]);
    // スプライトは文字列だけ残す
    expect(map["ok-1"].sprites).toEqual(["0006"]);
  });
});

describe("deckArchetypeToDeckDraft", () => {
  it("主デッキ名をデッキ名に(型名は含めない)、スプライトを 1 枠目・2 枠目のアイコンにする", () => {
    expect(
      deckArchetypeToDeckDraft({
        deckCode: "a-1",
        archetypeName: "ドラパルトex",
        variantName: "バシャーモ型",
        label: "ドラパルトex バシャーモ型",
        sprites: ["0887", "0257", "0006"],
      }),
    ).toEqual({
      name: "ドラパルトex",
      sprites: [
        { id: "0887", position: 1 },
        { id: "0257", position: 2 },
      ],
    });
  });

  it("空白の連続は 1 つに詰める", () => {
    expect(
      deckArchetypeToDeckDraft({
        deckCode: "a-1",
        archetypeName: " ガチグマ  アカツキex ",
        variantName: "メガユキメノコ型",
        label: "ガチグマ  アカツキex メガユキメノコ型",
        sprites: ["0901_bloodmoon"],
      }),
    ).toEqual({
      name: "ガチグマ アカツキex",
      sprites: [{ id: "0901_bloodmoon", position: 1 }],
    });
  });

  it("分類が無い・未分類は空(利用者が自分で入れる)", () => {
    expect(deckArchetypeToDeckDraft(undefined)).toEqual({ name: "", sprites: [] });
    expect(
      deckArchetypeToDeckDraft({
        deckCode: "a-1",
        archetypeName: null,
        variantName: null,
        label: null,
        sprites: [],
      }),
    ).toEqual({ name: "", sprites: [] });
  });
});

describe("deckDisplayName", () => {
  const summary = {
    code: "a-1",
    total: 60,
    mainPokemon: ["ヨマワル", "ヨノワール"],
    aceSpec: null,
    groups: [],
  };

  it("分類の名前を優先し、型名は括弧で囲む(空白の連続は詰める)", () => {
    expect(
      deckDisplayName(
        {
          deckCode: "a-1",
          archetypeName: "メガミミロップex ",
          variantName: "メガユキメノコ型",
          label: "メガミミロップex  メガユキメノコ型",
          sprites: [],
        },
        summary,
      ),
    ).toBe("メガミミロップex(メガユキメノコ型)");
  });

  it("型を持たない主デッキは名前だけ", () => {
    expect(
      deckDisplayName(
        {
          deckCode: "a-1",
          archetypeName: "ガチグマ  アカツキex",
          variantName: null,
          label: "ガチグマ  アカツキex",
          sprites: [],
        },
        summary,
      ),
    ).toBe("ガチグマ アカツキex");
  });

  it("分類が無い・未分類なら主なポケモンで呼ぶ", () => {
    expect(deckDisplayName(undefined, summary)).toBe("ヨマワル・ヨノワール");
    expect(
      deckDisplayName(
        { deckCode: "a-1", archetypeName: null, variantName: null, label: null, sprites: [] },
        summary,
      ),
    ).toBe("ヨマワル・ヨノワール");
  });

  it("どちらも無ければ空文字", () => {
    expect(deckDisplayName(undefined, undefined)).toBe("");
  });
});

describe("isDeckArchetypeChampionsleague", () => {
  it("大型大会の ID に含まれる年が 2027 以降なら分類が付く", () => {
    expect(isDeckArchetypeChampionsleague("cl2027_yokohama")).toBe(true);
    expect(isDeckArchetypeChampionsleague("cl2028_aichi")).toBe(true);
    expect(isDeckArchetypeChampionsleague("pjcs2026")).toBe(false);
    expect(isDeckArchetypeChampionsleague("cl2026_fukuoka")).toBe(false);
    expect(isDeckArchetypeChampionsleague("")).toBe(false);
    expect(isDeckArchetypeChampionsleague(undefined)).toBe(false);
  });
});
