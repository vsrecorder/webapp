// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import DeckDistributionShareCard, {
  type ShareDeckRow,
} from "@app/components/organisms/DeckUsage/DeckDistributionShareCard";

afterEach(cleanup);

// 凡例に1件だけ。スプライトは無しにして、見出しのスプライトと取り違えないようにする
const ROWS: ShareDeckRow[] = [
  {
    key: "r1",
    name: "ドラパルトex",
    spriteIds: [undefined, undefined],
    hasSprite: false,
    count: 3,
    usageRate: 1,
    winRate: 0.5,
  },
];

function renderCard(deck?: Parameters<typeof DeckDistributionShareCard>[0]["deck"]) {
  return render(
    <DeckDistributionShareCard
      title="対戦相手のデッキ分析"
      subtitle="直近3ヶ月"
      deck={deck}
      rows={ROWS}
      colors={["#000"]}
      softColors={["#fff"]}
      usageLabel="対面率"
      width={360}
    />,
  );
}

describe("DeckDistributionShareCard の使用デッキの見出し", () => {
  it("deck を渡さなければ使用デッキの行は出ない(デッキ使用率分析)", () => {
    renderCard(undefined);

    expect(screen.queryByText("すべての使用デッキ")).toBeNull();
    expect(screen.queryByText("使用時")).toBeNull();
  });

  it("null なら「すべての使用デッキ」を出す", () => {
    renderCard(null);

    expect(screen.getByText("すべての使用デッキ")).toBeTruthy();
    expect(screen.getByText("直近3ヶ月")).toBeTruthy();
  });

  it("使用デッキを選んでいればスプライトとデッキ名を見出しの下に出す", () => {
    renderCard({ name: "リザードンex", spriteIds: ["0006", "0004"], hasSprite: true });

    // 凡例の unknown 2枠とは別に、見出しのスプライト2枠が出る
    const alts = screen.getAllByRole("img").map((img) => img.getAttribute("alt"));
    expect(alts.slice(0, 2)).toEqual(["6", "4"]);
    expect(screen.getByText("『リザードンex』")).toBeTruthy();
    expect(screen.getByText("使用時")).toBeTruthy();
    expect(screen.queryByText("すべての使用デッキ")).toBeNull();
  });
});
