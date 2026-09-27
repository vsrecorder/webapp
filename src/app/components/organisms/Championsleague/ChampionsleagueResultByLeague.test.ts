import { describe, expect, it } from "vitest";

import { formatChampionsleagueWinner } from "@app/components/organisms/Championsleague/ChampionsleagueResultByLeague";

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
