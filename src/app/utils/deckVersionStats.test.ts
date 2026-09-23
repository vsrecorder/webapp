import { describe, expect, it } from "vitest";

import { DeckCodeUsageItemType } from "@app/types/deck_usage_stat";
import { pickBestVersionId, hasEnoughMatchesForWinRate } from "@app/utils/deckVersionStats";

function item(id: string, wins: number, losses: number, draws = 0): DeckCodeUsageItemType {
  const decided = wins + losses;
  return {
    deck_code_id: id,
    count: wins + losses + draws,
    wins,
    losses,
    draws,
    win_rate: decided > 0 ? wins / decided : 0,
  };
}

describe("hasEnoughMatchesForWinRate", () => {
  it("引き分けは対戦数に数えない", () => {
    expect(hasEnoughMatchesForWinRate(item("a", 2, 2, 3))).toBe(false);
    expect(hasEnoughMatchesForWinRate(item("a", 3, 2))).toBe(true);
  });
});

describe("pickBestVersionId", () => {
  it("勝率を出せるバージョンのうち最も勝率が高いものを選ぶ", () => {
    const items = [item("v1", 5, 7), item("v2", 14, 7), item("v3", 9, 6)];
    expect(pickBestVersionId(items, ["v3", "v2", "v1"])).toBe("v2");
  });

  it("対戦数が足りないバージョンは高勝率でも選ばない", () => {
    const items = [item("v1", 5, 7), item("v2", 6, 4), item("v3", 2, 0)];
    expect(pickBestVersionId(items, ["v3", "v2", "v1"])).toBe("v2");
  });

  it("比べられるバージョンが1つ以下なら印を付けない", () => {
    const items = [item("v1", 5, 7), item("v2", 2, 0)];
    expect(pickBestVersionId(items, ["v2", "v1"])).toBeNull();
    expect(pickBestVersionId([], ["v1"])).toBeNull();
  });

  it("画面に無いバージョン(削除済み)の成績は候補にしない", () => {
    const items = [item("gone", 10, 0), item("v1", 5, 5), item("v2", 6, 4)];
    expect(pickBestVersionId(items, ["v2", "v1"])).toBe("v2");
  });

  it("同じ勝率なら対戦数の多いほう、それも同じなら新しいほうを選ぶ", () => {
    expect(pickBestVersionId([item("v1", 6, 4), item("v2", 3, 2)], ["v2", "v1"])).toBe("v1");
    expect(pickBestVersionId([item("v1", 3, 2), item("v2", 3, 2)], ["v2", "v1"])).toBe("v2");
  });
});
