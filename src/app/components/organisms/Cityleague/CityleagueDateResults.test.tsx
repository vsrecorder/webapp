// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CityleagueDateResults from "@app/components/organisms/Cityleague/CityleagueDateResults";

import type { CityleagueDateLeague } from "@app/utils/cityleagueDateServer";

// 結果カードの中身(Swiper など)はここの関心事ではない。どの大会が描かれたかだけを見る
vi.mock("@app/components/organisms/Cityleague/CityleagueResult", () => ({
  default: ({
    event_result,
    official_event,
  }: {
    event_result: { official_event_id: number };
    official_event?: { shop_name: string };
  }) => (
    <div data-testid="result">
      {event_result.official_event_id}:{official_event?.shop_name ?? "-"}
    </div>
  ),
}));

const league = (
  leagueType: number,
  ids: number[],
): CityleagueDateLeague =>
  ({
    leagueType,
    results: ids.map((id) => ({ official_event_id: id })),
    events: ids.map((id) => ({ id, shop_name: `店${id}` })),
  }) as unknown as CityleagueDateLeague;

// HeroUI の Tabs は ResizeObserver で下線の位置を測る。jsdom には無いので空の実装を置く
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

afterEach(cleanup);

describe("CityleagueDateResults", () => {
  it("タブに件数を出し、結果のある最初のリーグ区分で開く", () => {
    render(
      <CityleagueDateResults
        leagues={[league(1, []), league(3, [11, 12]), league(2, [21])]}
      />,
    );

    expect(screen.getByRole("tab", { name: "オープン：0" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "シニア：2" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    // 開いたシニアだけを描き、店舗名はその日の公式イベントから引く
    expect(screen.getAllByTestId("result").map((e) => e.textContent)).toEqual([
      "11:店11",
      "12:店12",
    ]);
  });

  it("結果の無いリーグ区分はその旨を出す", () => {
    render(<CityleagueDateResults leagues={[league(1, []), league(3, []), league(2, [])]} />);

    expect(screen.getByText("この日のオープンリーグの結果はありません")).toBeTruthy();
  });
});
