// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CityleagueDateEventTabs from "@app/components/organisms/Cityleague/CityleagueDateEventTabs";

import { CityleagueResultType } from "@app/types/cityleague_result";
import { OfficialEventListItemType, OfficialEventType } from "@app/types/official_event";
import {
  clearCityleagueDateScrollTarget,
  markCityleagueDateScrollTarget,
} from "@app/utils/cityleagueScrollRestore";

// カードの中身(Swiper や画像)はここでは試さない。どの大会が並ぶかと、個別ページへ進む直前の控えだけを見る
vi.mock("@app/components/organisms/Cityleague/CityleagueResult", () => ({
  default: ({
    official_event,
    onOpenDetail,
  }: {
    official_event: OfficialEventListItemType;
    onOpenDetail?: () => void;
  }) => (
    <button data-testid="card" onClick={onOpenDetail}>
      {official_event.shop_name}のカード
    </button>
  ),
}));

// jsdom は ResizeObserver を持たない。HeroUI の Tabs が下線の位置を追うのに使う
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

function event(id: number, leagueTitle: string, shopName: string): OfficialEventType {
  return {
    id,
    league_title: leagueTitle,
    shop_name: shopName,
    date: new Date("2026-10-04"),
  } as OfficialEventType;
}

const EVENTS = [
  event(1, "オープン", "オープン会場"),
  event(2, "シニア", "シニア会場"),
  event(3, "ジュニア", "ジュニア会場"),
];

function result(officialEventId: number): CityleagueResultType {
  return {
    official_event_id: officialEventId,
    results: [],
  } as unknown as CityleagueResultType;
}

const RESULTS = [result(1), result(2), result(3)];

// 見えているカード(隠してある別のタブの列は数えない)
function visibleCards(): string[] {
  return screen
    .queryAllByTestId("card")
    .filter((card) => !card.closest("[hidden]"))
    .map((card) => card.textContent ?? "");
}

afterEach(() => {
  cleanup();
  clearCityleagueDateScrollTarget();
});

describe("CityleagueDateEventTabs", () => {
  it("初期表示では先頭のリーグ(オープン)の会場だけを出す", () => {
    render(<CityleagueDateEventTabs events={EVENTS} />);

    expect(screen.getByText("オープン会場")).toBeTruthy();
    expect(screen.queryByText("シニア会場")).toBeNull();
    expect(screen.queryByText("ジュニア会場")).toBeNull();
  });

  it("タブに区分ごとの件数を出す(「すべて」は出さない)", () => {
    render(<CityleagueDateEventTabs events={EVENTS} />);

    expect(screen.queryByRole("tab", { name: /すべて/ })).toBeNull();
    expect(screen.getByRole("tab", { name: "オープン 1件" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "シニア 1件" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "ジュニア 1件" })).toBeTruthy();
  });

  it("リーグのタブを押すと、そのリーグの会場だけに絞られる", () => {
    render(<CityleagueDateEventTabs events={EVENTS} />);

    fireEvent.click(screen.getByRole("tab", { name: "シニア 1件" }));

    expect(screen.getByText("シニア会場")).toBeTruthy();
    expect(screen.queryByText("オープン会場")).toBeNull();
    expect(screen.queryByText("ジュニア会場")).toBeNull();
  });

  it("タブを行き来しても、選んだリーグの会場だけに絞られ続ける", () => {
    render(<CityleagueDateEventTabs events={EVENTS} />);

    fireEvent.click(screen.getByRole("tab", { name: "シニア 1件" }));
    fireEvent.click(screen.getByRole("tab", { name: "ジュニア 1件" }));

    expect(screen.getByText("ジュニア会場")).toBeTruthy();
    expect(screen.queryByText("オープン会場")).toBeNull();
    expect(screen.queryByText("シニア会場")).toBeNull();
  });
});

describe("CityleagueDateEventTabs(結果カード)", () => {
  it("結果があれば、店舗名のリンクではなく選んだリーグの結果カードを並べる", () => {
    render(<CityleagueDateEventTabs events={EVENTS} results={RESULTS} deckArchetypes={{}} />);

    expect(visibleCards()).toEqual([
      "オープン会場のカード",
    ]);
    expect(screen.queryByRole("link", { name: /オープン会場/ })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "シニア 1件" }));

    expect(visibleCards()).toEqual([
      "シニア会場のカード",
    ]);
  });

  it("タブの件数は結果のある大会から数える", () => {
    render(<CityleagueDateEventTabs events={EVENTS} results={[result(1)]} deckArchetypes={{}} />);

    expect(screen.getByRole("tab", { name: "オープン 1件" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: /シニア/ })).toBeNull();
  });

  it("結果が取れなかったときは店舗名のリンクの一覧に戻す", () => {
    render(<CityleagueDateEventTabs events={EVENTS} results={null} />);

    expect(screen.queryByTestId("card")).toBeNull();
    expect(screen.getByRole("link", { name: /オープン会場/ })).toBeTruthy();
  });

  it("カードから個別ページへ進むときは、一覧ではなく開催日ページの戻り先を控える", () => {
    render(<CityleagueDateEventTabs events={EVENTS} results={RESULTS} deckArchetypes={{}} />);

    fireEvent.click(screen.getByRole("tab", { name: "シニア 1件" }));
    fireEvent.click(screen.getByText("シニア会場のカード"));

    expect(sessionStorage.getItem("cityleagueDateScrollToId")).toBe("2");
    expect(sessionStorage.getItem("cityleagueDateScrollToLeague")).toBe("シニア");
    // 一覧の控えを書くと、次に一覧を開いたときにこの大会を探して読み込み続ける
    expect(sessionStorage.getItem("cityleagueResultScrollToId")).toBeNull();
  });

  it("戻ってきたら、開いたカードのリーグのタブに合わせて控えを消す", async () => {
    markCityleagueDateScrollTarget(3, "ジュニア");

    render(<CityleagueDateEventTabs events={EVENTS} results={RESULTS} deckArchetypes={{}} />);

    await waitFor(() => expect(sessionStorage.getItem("cityleagueDateScrollToId")).toBeNull());
    expect(visibleCards()).toEqual([
      "ジュニア会場のカード",
    ]);
  });

  it("別の開催日で控えたものは使わずに消す", async () => {
    markCityleagueDateScrollTarget(99, "ジュニア");

    render(<CityleagueDateEventTabs events={EVENTS} results={RESULTS} deckArchetypes={{}} />);

    await waitFor(() => expect(sessionStorage.getItem("cityleagueDateScrollToId")).toBeNull());
    expect(visibleCards()).toEqual([
      "オープン会場のカード",
    ]);
  });

  it("表示中に書いた控えは受け取らない(戻ってきたページのために残す)", async () => {
    render(<CityleagueDateEventTabs events={EVENTS} results={RESULTS} deckArchetypes={{}} />);

    act(() => markCityleagueDateScrollTarget(1, "オープン"));
    await act(async () => {});

    expect(sessionStorage.getItem("cityleagueDateScrollToId")).toBe("1");
  });

  it("一度開いたタブの列は、別のタブへ移っても作り直さない", () => {
    render(<CityleagueDateEventTabs events={EVENTS} results={RESULTS} deckArchetypes={{}} />);

    const openCard = screen.getByText("オープン会場のカード");

    fireEvent.click(screen.getByRole("tab", { name: "シニア 1件" }));
    expect(visibleCards()).toEqual(["シニア会場のカード"]);

    fireEvent.click(screen.getByRole("tab", { name: "オープン 1件" }));
    expect(visibleCards()).toEqual(["オープン会場のカード"]);
    // 隠していただけなので、同じ要素がそのまま出る
    expect(screen.getByText("オープン会場のカード")).toBe(openCard);
  });

  it("初めて開いたタブは数枚ずつ描き足し、最後には全部並ぶ", async () => {
    const seniors = Array.from({ length: 10 }, (_, i) => event(100 + i, "シニア", `シニア${i}`));
    const events = [EVENTS[0], ...seniors];
    const results = [result(1), ...seniors.map((senior) => result(senior.id))];

    render(<CityleagueDateEventTabs events={events} results={results} deckArchetypes={{}} />);

    fireEvent.click(screen.getByRole("tab", { name: "シニア 10件" }));

    // 押した直後は先頭の数枚だけ
    expect(visibleCards().length).toBeLessThan(10);
    expect(visibleCards()[0]).toBe("シニア0のカード");

    await waitFor(() => expect(visibleCards()).toHaveLength(10));
  });

  it("初期表示のタブは最初から全部描く(サーバ描画と同じ)", () => {
    const opens = Array.from({ length: 10 }, (_, i) => event(200 + i, "オープン", `オープン${i}`));

    render(
      <CityleagueDateEventTabs
        events={opens}
        results={opens.map((open) => result(open.id))}
        deckArchetypes={{}}
      />,
    );

    expect(visibleCards()).toHaveLength(10);
  });
});
