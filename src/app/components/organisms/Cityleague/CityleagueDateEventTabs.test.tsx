// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CityleagueDateEventTabs from "@app/components/organisms/Cityleague/CityleagueDateEventTabs";

import { CityleagueResultType } from "@app/types/cityleague_result";
import { OfficialEventListItemType, OfficialEventType } from "@app/types/official_event";
import {
  CITYLEAGUE_DATE_RETURN_KEY,
  clearCityleagueDateReturn,
  markCityleagueDateReturn,
} from "@app/utils/cityleagueScrollRestore";
import { noteReturnNavigation } from "@app/utils/returnNavigation";

const DATE = "2026-10-04";
const PATH = `/cityleague_results/dates/${DATE}`;

vi.mock("next/navigation", () => ({
  usePathname: () => "/cityleague_results/dates/2026-10-04",
}));

// カードの中身(Swiper や画像)はここでは試さない。どの大会が並ぶかと、離れるときの控えだけを見る
vi.mock("@app/components/organisms/Cityleague/CityleagueResult", () => ({
  default: ({ official_event }: { official_event: OfficialEventListItemType }) => (
    <a data-testid="card" href={`/cityleague_results/${official_event.id}`}>
      {official_event.shop_name}のカード
    </a>
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
  clearCityleagueDateReturn();
  sessionStorage.clear();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

/*
 * jsdom は配置を計算しない(どの要素も幅 0)。見えているタブのカードだけ、縦に 500px ずつ
 * 並んでいる扱いにする(画面上端の1枚目は下端が 500px)
 */
let scrollOffset = 0;

function stubCardLayout() {
  scrollOffset = 0;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
    this: Element,
  ) {
    if (!this.id.startsWith("cityleague-date-result-") || this.closest("[hidden]")) {
      return { top: 0, bottom: 0, width: 0, height: 0 } as DOMRect;
    }
    const visible = [
      ...document.querySelectorAll('[id^="cityleague-date-result-"]'),
    ].filter((card) => !card.closest("[hidden]"));
    const top = visible.indexOf(this) * 500 - scrollOffset;
    return { top, bottom: top + 500, width: 300, height: 500 } as DOMRect;
  });
}


// 画面をずらしてスクロールイベントを送る(ページはスクロールのたびに画面上端のカードを覚える)
function scrollPage(offset: number) {
  scrollOffset = offset;
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

function savedReturn() {
  const raw = sessionStorage.getItem(CITYLEAGUE_DATE_RETURN_KEY);
  return raw === null ? null : JSON.parse(raw);
}

// 控えたあとに、このページへ戻ってきたことにする(時刻は控えより後にずらす)
async function returnHere() {
  await new Promise((resolve) => setTimeout(resolve, 2));
  noteReturnNavigation(PATH);
}

describe("CityleagueDateEventTabs", () => {
  it("初期表示では先頭のリーグ(オープン)の会場だけを出す", () => {
    render(<CityleagueDateEventTabs dateParam={DATE} events={EVENTS} />);

    expect(screen.getByText("オープン会場")).toBeTruthy();
    expect(screen.queryByText("シニア会場")).toBeNull();
    expect(screen.queryByText("ジュニア会場")).toBeNull();
  });

  it("タブに区分ごとの件数を出す(「すべて」は出さない)", () => {
    render(<CityleagueDateEventTabs dateParam={DATE} events={EVENTS} />);

    expect(screen.queryByRole("tab", { name: /すべて/ })).toBeNull();
    expect(screen.getByRole("tab", { name: "オープン 1件" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "シニア 1件" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "ジュニア 1件" })).toBeTruthy();
  });

  it("リーグのタブを押すと、そのリーグの会場だけに絞られる", () => {
    render(<CityleagueDateEventTabs dateParam={DATE} events={EVENTS} />);

    fireEvent.click(screen.getByRole("tab", { name: "シニア 1件" }));

    expect(screen.getByText("シニア会場")).toBeTruthy();
    expect(screen.queryByText("オープン会場")).toBeNull();
    expect(screen.queryByText("ジュニア会場")).toBeNull();
  });

  it("タブを行き来しても、選んだリーグの会場だけに絞られ続ける", () => {
    render(<CityleagueDateEventTabs dateParam={DATE} events={EVENTS} />);

    fireEvent.click(screen.getByRole("tab", { name: "シニア 1件" }));
    fireEvent.click(screen.getByRole("tab", { name: "ジュニア 1件" }));

    expect(screen.getByText("ジュニア会場")).toBeTruthy();
    expect(screen.queryByText("オープン会場")).toBeNull();
    expect(screen.queryByText("シニア会場")).toBeNull();
  });
});

describe("CityleagueDateEventTabs(結果カード)", () => {
  it("結果があれば、店舗名のリンクではなく選んだリーグの結果カードを並べる", () => {
    render(<CityleagueDateEventTabs dateParam={DATE} events={EVENTS} results={RESULTS} deckArchetypes={{}} />);

    expect(visibleCards()).toEqual([
      "オープン会場のカード",
    ]);
    // 店舗名のリンクの一覧(CityleagueEventLinkList の ul)は出さない
    expect(document.querySelector("ul")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "シニア 1件" }));

    expect(visibleCards()).toEqual([
      "シニア会場のカード",
    ]);
  });

  it("タブの件数は結果のある大会から数える", () => {
    render(<CityleagueDateEventTabs dateParam={DATE} events={EVENTS} results={[result(1)]} deckArchetypes={{}} />);

    expect(screen.getByRole("tab", { name: "オープン 1件" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: /シニア/ })).toBeNull();
  });

  it("結果が取れなかったときは店舗名のリンクの一覧に戻す", () => {
    render(<CityleagueDateEventTabs dateParam={DATE} events={EVENTS} results={null} />);

    expect(screen.queryByTestId("card")).toBeNull();
    expect(screen.getByRole("link", { name: /オープン会場/ })).toBeTruthy();
  });

  /*
   * ユーザーメニュー・通知・記録中のバー(router.push)や、スクロールの慣性中に押した下部ナビ
   * (touchend で移る)のように、リンクの click を出さない移り方もあるので、ページが外れるときに控える
   */
  it("ページが外れるとき、今のタブと画面上端のカードを控える(一覧の控えは書かない)", () => {
    const { unmount } = render(
      <CityleagueDateEventTabs dateParam={DATE} events={EVENTS} results={RESULTS} deckArchetypes={{}} />,
    );
    stubCardLayout();
    scrollPage(0);

    fireEvent.click(screen.getByRole("tab", { name: "シニア 1件" }));
    unmount();

    expect(savedReturn()).toMatchObject({ date: DATE, league: "シニア", anchorEventId: 2 });
    expect(sessionStorage.getItem("returnAnchorTop:cityleague-date-result-2")).toBe("0");
    // 一覧の控えを書くと、次に一覧を開いたときにこの大会を探して読み込み続ける
    expect(sessionStorage.getItem("cityleagueResultScrollToId")).toBeNull();
  });

  it("画面上端が固定ヘッダーに隠れたカードなら、その次のカードを控える", () => {
    const opens = [event(10, "オープン", "A"), event(11, "オープン", "B")];
    const { unmount } = render(
      <CityleagueDateEventTabs
        dateParam={DATE}
        events={opens}
        results={opens.map((open) => result(open.id))}
        deckArchetypes={{}}
      />,
    );
    stubCardLayout();
    // 1枚目の下端が上端から 50px(ヘッダーの裏)
    scrollPage(450);

    unmount();

    expect(savedReturn()).toMatchObject({ anchorEventId: 11 });
    expect(sessionStorage.getItem("returnAnchorTop:cityleague-date-result-11")).toBe("50");
  });

  /*
   * ブラウザの戻る/進むで離れるときは、先頭リセット(useScrollResetOnNavigation の popstate)が
   * ページが外れるより先に走る。リセット前の位置を控える
   */
  it("ブラウザの戻る/進むで離れるときは、先頭へ戻される前の位置を控える", () => {
    const { unmount } = render(
      <CityleagueDateEventTabs dateParam={DATE} events={EVENTS} results={RESULTS} deckArchetypes={{}} />,
    );
    stubCardLayout();
    scrollPage(120);

    // 別のページへの履歴移動(popstate の時点で URL は移動先になっている)と、その後の先頭リセット。
    // 外れる時点ではもう先頭にいる
    window.history.replaceState(null, "", "/cityleague_results/dates");
    window.dispatchEvent(new PopStateEvent("popstate"));
    scrollPage(0);
    unmount();

    expect(sessionStorage.getItem("returnAnchorTop:cityleague-date-result-1")).toBe("-120");
  });

  it("このページにとどまる popstate(モーダルを閉じるバック)のあとも、位置を覚え続ける", () => {
    window.history.replaceState(null, "", PATH);
    const { unmount } = render(
      <CityleagueDateEventTabs dateParam={DATE} events={EVENTS} results={RESULTS} deckArchetypes={{}} />,
    );
    stubCardLayout();
    scrollPage(120);

    window.dispatchEvent(new PopStateEvent("popstate"));
    // そのあと読み進めてから離れる
    scrollPage(300);
    unmount();

    expect(sessionStorage.getItem("returnAnchorTop:cityleague-date-result-1")).toBe("-300");
  });

  it("戻ってきたら、離れたときのタブに合わせて控えを消す", async () => {
    markCityleagueDateReturn({ date: DATE, league: "ジュニア", anchorEventId: 3 });
    await returnHere();

    render(<CityleagueDateEventTabs dateParam={DATE} events={EVENTS} results={RESULTS} deckArchetypes={{}} />);

    await waitFor(() => expect(savedReturn()).toBeNull());
    expect(visibleCards()).toEqual(["ジュニア会場のカード"]);
    // 先頭のタブ(オープン)の列は、隠した状態でも描かない(使わない列を全部描くのは重い)
    expect(screen.queryByText("オープン会場のカード")).toBeNull();
  });

  it("戻ってきたのでなければ(別の経路で開き直したなら)、控えを使わずに消す", async () => {
    markCityleagueDateReturn({ date: DATE, league: "ジュニア", anchorEventId: 3 });

    render(<CityleagueDateEventTabs dateParam={DATE} events={EVENTS} results={RESULTS} deckArchetypes={{}} />);

    await waitFor(() => expect(savedReturn()).toBeNull());
    expect(visibleCards()).toEqual(["オープン会場のカード"]);
  });

  it("別の開催日の控えは使わず、消さずに残す(その日へ戻ったときに使う)", async () => {
    markCityleagueDateReturn({ date: "2026-10-03", league: "ジュニア", anchorEventId: 3 });
    await returnHere();

    render(<CityleagueDateEventTabs dateParam={DATE} events={EVENTS} results={RESULTS} deckArchetypes={{}} />);
    await act(async () => {});

    expect(savedReturn()).toMatchObject({ date: "2026-10-03" });
    expect(visibleCards()).toEqual(["オープン会場のカード"]);
  });

  it("表示中に書いた控えは受け取らない(戻ってきたページのために残す)", async () => {
    render(<CityleagueDateEventTabs dateParam={DATE} events={EVENTS} results={RESULTS} deckArchetypes={{}} />);

    act(() => markCityleagueDateReturn({ date: DATE, league: "オープン", anchorEventId: 1 }));
    await returnHere();
    await act(async () => {});

    expect(savedReturn()).toMatchObject({ anchorEventId: 1 });
  });

  it("一度開いたタブの列は、別のタブへ移っても作り直さない", () => {
    render(<CityleagueDateEventTabs dateParam={DATE} events={EVENTS} results={RESULTS} deckArchetypes={{}} />);

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

    render(<CityleagueDateEventTabs dateParam={DATE} events={events} results={results} deckArchetypes={{}} />);

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
        dateParam={DATE}
        events={opens}
        results={opens.map((open) => result(open.id))}
        deckArchetypes={{}}
      />,
    );

    expect(visibleCards()).toHaveLength(10);
  });
});
