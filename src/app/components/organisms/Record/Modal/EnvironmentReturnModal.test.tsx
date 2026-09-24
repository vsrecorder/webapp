// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import EnvironmentReturnModal from "@app/components/organisms/Record/Modal/EnvironmentReturnModal";
import { WeeklyDeckUsageItemType } from "@app/types/weekly_deck_usage_stat";

afterEach(() => {
  cleanup();
});

// 全体 100 件のうち 36 件(「その他」10 件を除いた 90 件を分母にすると 40.0%)
const item = (fingerprint: string, count: number, members?: WeeklyDeckUsageItemType[]) =>
  ({
    fingerprint,
    count,
    usage_rate: count / 100,
    wins: 0,
    losses: 0,
    win_rate: 0.5,
    pokemon_sprites: fingerprint.split(",").map((id, i) => ({ id, position: i + 1 })),
    ...(members ? { members } : {}),
  }) as WeeklyDeckUsageItemType;

describe("EnvironmentReturnModal", () => {
  it("使用率は「その他」を含む全体の中の割合で出す", () => {
    const row = item("0006,0018", 36);
    const firstRow = item("0006", 54, [item("0006,0018", 36), item("0006,0477", 18)]);

    render(
      <EnvironmentReturnModal
        isOpen
        savedLabel="記録できました"
        opponentName="リザードンex"
        opponentSprites={[]}
        position={{ rank: 1, row }}
        firstSprite={{ rank: 1, row: firstRow, member: firstRow.members![0] }}
        victory
        primaryCta={{ label: "閉じる", onPress: vi.fn() }}
      />,
    );

    const text = document.body.textContent ?? "";
    expect(text).toContain("36.0%");
    expect(text).toContain("54.0%");
    expect(text).not.toContain("40.0%");
    expect(text).not.toContain("60.0%");
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
