import { afterEach, describe, expect, it, vi } from "vitest";

import { getCityleagueWinners } from "@app/utils/cityleagueWinner";
import { getCityleagueResultByOfficialEventId } from "@app/utils/cityleague";
import { getDeckArchetypesByCodes } from "@app/utils/deckArchetypeServer";
import { getDeckSummaries } from "@app/utils/deckSummaryServer";

import { CityleagueResultType } from "@app/types/cityleague_result";
import { OfficialEventType } from "@app/types/official_event";

vi.mock("@app/utils/cityleague", () => ({ getCityleagueResultByOfficialEventId: vi.fn() }));
vi.mock("@app/utils/deckArchetypeServer", () => ({ getDeckArchetypesByCodes: vi.fn() }));
vi.mock("@app/utils/deckSummaryServer", () => ({ getDeckSummaries: vi.fn() }));

// 大会ID → 優勝者のデッキコードとシーズン
const RESULTS: Record<number, { schedule: string; code: string; player: string }> = {
  1115321: { schedule: "2027s1", code: "gLHng9-cjxplA-gQPggn", player: "さとりく" },
  952758: { schedule: "2026s4", code: "OLD111-OLD222-OLD333", player: "むかし" },
};

const events = Object.keys(RESULTS).map((id) => ({ id: Number(id) })) as OfficialEventType[];

function mockSources({ archetypesFail = false } = {}) {
  vi.mocked(getCityleagueResultByOfficialEventId).mockImplementation(
    async (id: number) =>
      ({
        cityleague_schedule_id: RESULTS[id].schedule,
        results: [
          { rank: 1, player_name: RESULTS[id].player, deck_code: RESULTS[id].code },
          { rank: 2, player_name: "準優勝", deck_code: "OTHER1-OTHER2-OTHER3" },
        ],
      }) as unknown as CityleagueResultType,
  );
  vi.mocked(getDeckSummaries).mockResolvedValue({
    "gLHng9-cjxplA-gQPggn": { mainPokemon: ["ドラパルトex"] },
    "OLD111-OLD222-OLD333": { mainPokemon: ["ケーシィ", "ユンゲラー"] },
  } as never);
  if (archetypesFail) {
    vi.mocked(getDeckArchetypesByCodes).mockRejectedValue(new Error("timeout"));
  } else {
    vi.mocked(getDeckArchetypesByCodes).mockResolvedValue({
      "gLHng9-cjxplA-gQPggn": {
        deckCode: "gLHng9-cjxplA-gQPggn",
        archetypeName: "ドラパルトex",
        variantName: "カーストボム型",
        label: "ドラパルトex カーストボム型",
        sprites: ["0887", "0477"],
      },
    });
  }
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("getCityleagueWinners", () => {
  it("分類が付くシーズンは個別ページと同じく「主デッキ名(型名)」で呼ぶ", async () => {
    // 以前は一覧だけ主なポケモン(「ドラパルトex」)で呼んでいて、個別ページと食い違っていた
    mockSources();
    const winners = await getCityleagueWinners(events);

    expect(winners[1115321]).toEqual({
      playerName: "さとりく",
      deckName: "ドラパルトex(カーストボム型)",
    });
  });

  it("分類が付く前のシーズンは主なポケモンで呼び、分類は照会しない", async () => {
    mockSources();
    const winners = await getCityleagueWinners(events);

    expect(winners[952758].deckName).toBe("ケーシィ・ユンゲラー");
    expect(getDeckArchetypesByCodes).toHaveBeenCalledWith(["gLHng9-cjxplA-gQPggn"]);
  });

  it("分類が取れなかったときは主なポケモンで呼び、一覧は落とさない", async () => {
    mockSources({ archetypesFail: true });
    const winners = await getCityleagueWinners(events);

    expect(winners[1115321].deckName).toBe("ドラパルトex");
    expect(winners[952758].deckName).toBe("ケーシィ・ユンゲラー");
  });
});
