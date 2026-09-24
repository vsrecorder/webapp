import { describe, expect, it } from "vitest";

import { findFirstSpritePosition } from "@app/utils/deckEnv";
import {
  WeeklyDeckUsageItemType,
  WeeklyDeckUsageStatType,
} from "@app/types/weekly_deck_usage_stat";

// 集計行を最小限の項目で作る
function item(
  fingerprint: string,
  count: number,
  members?: WeeklyDeckUsageItemType[],
): WeeklyDeckUsageItemType {
  return {
    fingerprint,
    count,
    usage_rate: 0,
    wins: 0,
    losses: 0,
    win_rate: 0.5,
    pokemon_sprites: fingerprint === "" ? [] : [{ id: fingerprint.split(",")[0], position: 1 }],
    members,
  };
}

// 1体目でまとめた集計(grouping=first_sprite)。「その他」10件を含む計100件。
const stat: WeeklyDeckUsageStatType = {
  week: "2026-09-14",
  week_start: "2026-09-14",
  week_end: "2026-09-20",
  grouping: "first_sprite",
  total_votes: 100,
  contributor_count: 5,
  decks: [
    item("0887", 60, [item("0477,0887", 40), item("0257,0887", 20)]),
    item("0448_mega", 30, [item("0448_mega,0982", 28), item("0448_mega,1017_cornerstone", 2)]),
    item("", 10),
  ],
};

describe("findFirstSpritePosition", () => {
  it("組み合わせの指紋から親行と内訳を引き当てる", () => {
    const pos = findFirstSpritePosition(stat, [
      { id: "0887", position: 1 },
      { id: "0477", position: 2 },
    ]);
    expect(pos?.rank).toBe(1);
    expect(pos?.row.fingerprint).toBe("0887");
    expect(pos?.member?.count).toBe(40);
    // 分母は「その他」を除いた件数
    expect(pos?.exclOtherTotal).toBe(90);
  });

  it("1体目と2体目を逆に登録していても、内訳から多数派の行を引き当てる", () => {
    const pos = findFirstSpritePosition(stat, [
      { id: "0477", position: 1 },
      { id: "0887", position: 2 },
    ]);
    expect(pos?.row.fingerprint).toBe("0887");
    expect(pos?.member?.fingerprint).toBe("0477,0887");
  });

  it("内訳に無い組み合わせは、1体目の指紋で行を引き当て member は null", () => {
    const pos = findFirstSpritePosition(stat, [
      { id: "0448_mega", position: 1 },
      { id: "0338", position: 2 },
    ]);
    expect(pos?.rank).toBe(2);
    expect(pos?.member).toBeNull();
  });

  it("どの行にも当たらなければ null", () => {
    expect(findFirstSpritePosition(stat, [{ id: "0025", position: 1 }])).toBeNull();
  });

  it("スプライト未設定は null(「その他」と突き合わせない)", () => {
    expect(findFirstSpritePosition(stat, [])).toBeNull();
  });
});
