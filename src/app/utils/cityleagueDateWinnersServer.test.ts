import { beforeEach, describe, expect, it, vi } from "vitest";

import { CityleagueResultType } from "@app/types/cityleague_result";
import { DeckArchetypeMap, DeckArchetypeType } from "@app/types/deck_archetype";
import { OfficialEventType } from "@app/types/official_event";

// 開催日の OGP 画像に載せる優勝デッキの集計。分類(バトラボの索引)が結果の登録より遅れている間は
// 「まだ数えられない」(pending)を返し、欠けた画像を置かせないためのテスト

const { getResult, getArchetypes } = vi.hoisted(() => ({
  getResult: vi.fn(),
  getArchetypes: vi.fn(),
}));

vi.mock("@app/utils/cityleague", () => ({
  getCityleagueResultByOfficialEventId: getResult,
}));
vi.mock("@app/utils/deckArchetypeServer", () => ({
  getDeckArchetypesByCodes: getArchetypes,
}));

import { getDateWinnerDecks } from "./cityleagueDateWinnersServer";

function event(id: number): OfficialEventType {
  return { id } as OfficialEventType;
}

function result(scheduleId: string, winnerCode: string): CityleagueResultType {
  return {
    cityleague_schedule_id: scheduleId,
    results: [{ rank: 1, deck_code: winnerCode }],
  } as unknown as CityleagueResultType;
}

function archetype(deckCode: string, name: string | null): DeckArchetypeType {
  return {
    deckCode,
    archetypeName: name,
    variantName: null,
    label: name,
    sprites: name ? ["0001"] : [],
  };
}

// 2026-09-28 の 2 大会(1115011 は索引への取り込みが遅れていた)
const RESULTS: Record<number, CityleagueResultType> = {
  1115011: result("2027s1", "J88cK4-jKNW0q-x884G8"),
  1115619: result("2027s1", "ppRpyU-4UA810-pySMp3"),
};

describe("getDateWinnerDecks", () => {
  beforeEach(() => {
    getResult.mockReset().mockImplementation(async (id: number) => RESULTS[id] ?? null);
    getArchetypes.mockReset();
  });

  it("バトラボの応答に無い優勝デッキは pending に数える", async () => {
    getArchetypes.mockResolvedValue({
      "ppRpyU-4UA810-pySMp3": archetype("ppRpyU-4UA810-pySMp3", "ストリンダーバレット"),
    } satisfies DeckArchetypeMap);

    const { winners, pending } = await getDateWinnerDecks([event(1115011), event(1115619)]);

    expect(winners.map((deck) => deck.name)).toEqual(["ストリンダーバレット"]);
    expect(pending).toBe(1);
  });

  it("全部そろえば pending は 0", async () => {
    getArchetypes.mockResolvedValue({
      "J88cK4-jKNW0q-x884G8": archetype("J88cK4-jKNW0q-x884G8", "メガドリュウズex"),
      "ppRpyU-4UA810-pySMp3": archetype("ppRpyU-4UA810-pySMp3", "ストリンダーバレット"),
    } satisfies DeckArchetypeMap);

    const { winners, pending } = await getDateWinnerDecks([event(1115011), event(1115619)]);

    expect(winners).toHaveLength(2);
    expect(pending).toBe(0);
  });

  it("バトラボが応答しない(空の辞書)ときは全部 pending", async () => {
    getArchetypes.mockResolvedValue({});

    const { winners, pending } = await getDateWinnerDecks([event(1115011), event(1115619)]);

    expect(winners).toEqual([]);
    expect(pending).toBe(2);
  });

  it("未分類(索引にはあるが主デッキに当たらない)は待たない", async () => {
    getArchetypes.mockResolvedValue({
      "J88cK4-jKNW0q-x884G8": archetype("J88cK4-jKNW0q-x884G8", null),
      "ppRpyU-4UA810-pySMp3": archetype("ppRpyU-4UA810-pySMp3", "ストリンダーバレット"),
    } satisfies DeckArchetypeMap);

    const { pending } = await getDateWinnerDecks([event(1115011), event(1115619)]);

    expect(pending).toBe(0);
  });

  it("分類を付けない旧シーズンの大会はバトラボに問い合わせず、待たない", async () => {
    getResult.mockResolvedValue(result("2026s4", "old-code"));

    const { winners, pending } = await getDateWinnerDecks([event(952758)]);

    expect(getArchetypes).not.toHaveBeenCalled();
    expect(winners).toEqual([]);
    expect(pending).toBe(0);
  });
});
