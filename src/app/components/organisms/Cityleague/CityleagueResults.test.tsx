// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CityleagueResults from "@app/components/organisms/Cityleague/CityleagueResults";

import { CityleagueResultType } from "@app/types/cityleague_result";
import {
  CITYLEAGUE_LATEST_RETURN_KEY,
  CITYLEAGUE_SCROLL_TO_SAVED_AT_KEY,
  clearCityleagueResultScrollTarget,
  markCityleagueResultDeparture,
  markCityleagueResultScrollTarget,
} from "@app/utils/cityleagueScrollRestore";
import { noteReturnNavigation } from "@app/utils/returnNavigation";
import { writeReturnTarget } from "@app/utils/returnTarget";
import {
  CityleagueListInitialData,
  CityleagueScheduleContext,
} from "@app/utils/cityleagueListServer";
import { shiftDateString } from "@app/utils/cityleagueListPage";
import { todayJSTDateString } from "@app/utils/date";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/cityleague_results",
}));

// カードの中身(Swiper や画像)はここでは試さない。どの大会がどの順で並ぶかだけを見る
vi.mock("@app/components/organisms/Cityleague/CityleagueResult", () => ({
  default: ({ event_result }: { event_result: CityleagueResultType }) => (
    <div data-testid="card">{event_result.official_event_id}</div>
  ),
}));

// スケジュールはサーバで解決済みとして渡し、結果の取得だけを試す。
// 開催期間は1日だけにして、失敗が「遡る日付が尽きた」と紛れないようにする
const SCHEDULE_CONTEXT: CityleagueScheduleContext = {
  schedule: {
    id: "s1",
    title: "テストシーズン",
    from_date: new Date("2026-05-06"),
    to_date: new Date("2026-05-06"),
  } as CityleagueScheduleContext["schedule"],
  isOngoing: false,
  startDate: "2026-05-06",
};

function stubFetch(responses: ("ok" | "error")[]) {
  let call = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("/api/cityleague_results")) {
        const mode = responses[Math.min(call, responses.length - 1)];
        call += 1;
        return mode === "ok"
          ? Response.json({ count: 0, event_results: [] })
          : new Response('{"message":"error"}', { status: 500 });
      }
      return Response.json([]);
    }),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CityleagueResults の取得失敗", () => {
  it("失敗を「直近のシティリーグ結果はありません」と区別して表示する", async () => {
    stubFetch(["error"]);
    render(<CityleagueResults league_type={1} scheduleContext={SCHEDULE_CONTEXT} />);

    await waitFor(() =>
      expect(screen.getByText("シティリーグ結果を取得できませんでした")).toBeTruthy(),
    );
    expect(screen.queryByText("直近のシティリーグ結果はありません")).toBeNull();
  });

  it("結果が無いときは従来どおり空状態を出す", async () => {
    stubFetch(["ok"]);
    render(<CityleagueResults league_type={1} scheduleContext={SCHEDULE_CONTEXT} />);

    await waitFor(() =>
      expect(screen.getByText("直近のシティリーグ結果はありません")).toBeTruthy(),
    );
    expect(screen.queryByText("シティリーグ結果を取得できませんでした")).toBeNull();
  });

  it("「再読み込み」で取り直せる", async () => {
    stubFetch(["error", "ok"]);
    render(<CityleagueResults league_type={1} scheduleContext={SCHEDULE_CONTEXT} />);

    await waitFor(() =>
      expect(screen.getByText("シティリーグ結果を取得できませんでした")).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: /再読み込み/ }));

    await waitFor(() =>
      expect(screen.getByText("直近のシティリーグ結果はありません")).toBeTruthy(),
    );
  });
});

describe("CityleagueResults の空状態の文言", () => {
  // 開催初日などは大会が終わるまで結果が無い。開催期間外の文言だと食い違うので切り替える
  it("開催中は「結果の登録待ち」を伝える", async () => {
    stubFetch(["ok"]);
    render(
      <CityleagueResults
        league_type={1}
        scheduleContext={{ ...SCHEDULE_CONTEXT, isOngoing: true }}
      />,
    );

    await waitFor(() =>
      expect(screen.getByText("シティリーグの結果はまだありません")).toBeTruthy(),
    );
    expect(screen.queryByText("直近のシティリーグ結果はありません")).toBeNull();
    expect(screen.queryByText("次のシーズン開幕をお楽しみに")).toBeNull();
  });

  it("開催期間外は「次のシーズン待ち」を伝える", async () => {
    stubFetch(["ok"]);
    render(<CityleagueResults league_type={1} scheduleContext={SCHEDULE_CONTEXT} />);

    await waitFor(() =>
      expect(screen.getByText("次のシーズン開幕をお楽しみに")).toBeTruthy(),
    );
    expect(screen.queryByText("シティリーグの結果はまだありません")).toBeNull();
  });
});

describe("CityleagueResults の想定外の応答", () => {
  // 200 で {message: "..."} のような別の形が返ると、配列展開でページごと
  // エラー画面へ落ちていた。空として扱い、画面は保つ。
  it("200 で配列でない応答が返っても落ちない", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ message: "error" })),
    );
    render(<CityleagueResults league_type={1} scheduleContext={SCHEDULE_CONTEXT} />);

    await waitFor(() =>
      expect(screen.getByText("直近のシティリーグ結果はありません")).toBeTruthy(),
    );
  });
});

describe("CityleagueResults の上端の取り直し", () => {
  // 開催中のシーズン。今日(10/8)の結果が、サーバで描いた時点(10/7 まで)より後に登録された
  const ONGOING: CityleagueScheduleContext = {
    schedule: {
      id: "2027s1",
      title: "テストシーズン",
      from_date: new Date("2026-09-26T00:00:00+09:00"),
      to_date: new Date("2026-11-15T00:00:00+09:00"),
    } as CityleagueScheduleContext["schedule"],
    isOngoing: true,
    startDate: "2026-10-07",
  };

  const result = (id: number, date: string) =>
    ({ official_event_id: id, date: `${date}T00:00:00+09:00` }) as unknown as CityleagueResultType;

  // デッキ分類の対象シーズンの結果(優勝デッキのコード付き)
  const resultWithDeck = (id: number, date: string, deckCode: string) =>
    ({
      official_event_id: id,
      date: `${date}T00:00:00+09:00`,
      cityleague_schedule_id: "2027s1",
      results: [{ rank: 1, deck_code: deckCode }],
    }) as unknown as CityleagueResultType;

  const INITIAL: CityleagueListInitialData = {
    ...ONGOING,
    results: [result(11, "2026-10-07"), result(12, "2026-10-07")],
    events: [],
    deckArchetypes: {},
    nextFromDate: "2026-10-06",
    hasMore: true,
  };

  // 範囲指定の取得には、その時点で登録されている結果を返す。
  // デッキ分類は、pending に入っているコードを「まだ分類できない」と答える
  function stubUpstream(
    registered: () => CityleagueResultType[],
    pending: () => ReadonlySet<string> = () => new Set(),
  ) {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url);
        if (url.includes("/api/cityleague_results?")) {
          const params = new URL(url, "http://localhost").searchParams;
          const from = params.get("from_date")!;
          const to = params.get("to_date")!;
          const hits = registered().filter((r) => {
            const date = String(r.date).slice(0, 10);
            return from <= date && date <= to;
          });
          return Response.json({ count: hits.length, event_results: hits });
        }
        if (url.includes("/api/official_events")) return Response.json({ official_events: [] });
        // サーバの判定(1 枚)。今日・昨日の結果について、pending のコードを含む大会を分類待ちにする
        if (url.includes("/recent_deck_archetypes")) {
          const today = todayJSTDateString();
          const date = new URL(url, "http://localhost").searchParams.get("date");
          const recent = registered().filter((r) => {
            const d = String(r.date).slice(0, 10);
            return d >= shiftDateString(today, -1) && d <= today && (!date || d === date);
          });
          const waiting = pending();
          const codesOf = (r: CityleagueResultType) => (r.results ?? []).map((x) => x.deck_code);
          const ready = recent.filter((r) => !codesOf(r).some((code) => waiting.has(code)));
          return Response.json({
            today,
            checked: recent.map((r) => r.official_event_id),
            awaiting: recent.filter((r) => !ready.includes(r)).map((r) => r.official_event_id),
            decks: Object.fromEntries(
              ready.flatMap(codesOf).map((code) => [
                code,
                { deckCode: code, archetypeName: "ドラパルトex", variantName: null, label: "ドラパルトex", sprites: [] },
              ]),
            ),
          });
        }
        return Response.json({ decks: {} });
      }),
    );
    return calls;
  }

  const cardIds = () => screen.getAllByTestId("card").map((el) => Number(el.textContent));
  // 進行中の取得(fetch → json → 反映)を最後まで流す
  const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("マウント直後に取り直し、後から登録された結果を上に差し込む", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-08T21:00:00+09:00") });
    const calls = stubUpstream(() => [
      result(1, "2026-10-08"),
      result(11, "2026-10-07"),
      result(12, "2026-10-07"),
    ]);

    render(<CityleagueResults league_type={1} initial={INITIAL} scheduleContext={ONGOING} />);

    // サーバで取ったぶんがまず出る
    expect(cardIds()).toEqual([11, 12]);

    await waitFor(() => expect(cardIds()).toEqual([1, 11, 12]));
    expect(calls.some((url) => url.includes("from_date=2026-10-07&to_date=2026-10-08"))).toBe(true);
  });

  it("アプリへ戻ってきたら取り直す。間を置かずに戻ったときは取りに行かない", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-08T12:00:00+09:00") });
    let registered = [result(11, "2026-10-07"), result(12, "2026-10-07")];
    const calls = stubUpstream(() => registered);
    const resultCalls = () => calls.filter((url) => url.includes("/api/cityleague_results?")).length;

    render(<CityleagueResults league_type={1} initial={INITIAL} scheduleContext={ONGOING} />);
    await waitFor(() => expect(resultCalls()).toBe(1));
    // マウント直後の取り直しが終わるまで待つ(途中で重なった要求は、その取り直しに吸収される)
    await settle();

    // すぐ戻ってきたぶんは間引く
    registered = [result(1, "2026-10-08"), ...registered];
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await act(async () => {});
    expect(resultCalls()).toBe(1);
    expect(cardIds()).toEqual([11, 12]);

    // 時間を置いて戻ってきたら取り直す
    vi.setSystemTime(new Date("2026-10-08T21:00:00+09:00"));
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await waitFor(() => expect(cardIds()).toEqual([1, 11, 12]));
    expect(resultCalls()).toBe(2);
  });

  // 結果はバトラボの索引より数分早く入る。分類が揃うまでは出さず、揃ったら取り直しで差し込む
  it("デッキ分類がまだ揃わない大会は出さず、揃ってから取り直したときに差し込む", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-08T12:00:00+09:00") });
    const waiting = new Set(["P-1"]);
    stubUpstream(
      () => [
        resultWithDeck(1, "2026-10-08", "P-1"),
        resultWithDeck(2, "2026-10-08", "R-1"),
        result(11, "2026-10-07"),
        result(12, "2026-10-07"),
      ],
      () => waiting,
    );

    render(<CityleagueResults league_type={1} initial={INITIAL} scheduleContext={ONGOING} />);

    await waitFor(() => expect(cardIds()).toEqual([2, 11, 12]));
    await settle();

    // 分類が揃ってから戻ってくると、出さずにいた大会が入る
    waiting.clear();
    vi.setSystemTime(new Date("2026-10-08T21:00:00+09:00"));
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await waitFor(() => expect(cardIds()).toEqual([1, 2, 11, 12]));
  });

  it("分類待ちの大会がある間は、開いたままでも間を置いて取り直す", async () => {
    vi.useFakeTimers({
      toFake: ["Date", "setInterval", "clearInterval"],
      now: new Date("2026-10-08T21:00:00+09:00"),
    });
    const waiting = new Set(["P-1"]);
    const calls = stubUpstream(
      () => [resultWithDeck(1, "2026-10-08", "P-1"), result(11, "2026-10-07"), result(12, "2026-10-07")],
      () => waiting,
    );
    const resultCalls = () => calls.filter((url) => url.includes("/api/cityleague_results?")).length;

    render(<CityleagueResults league_type={1} initial={INITIAL} scheduleContext={ONGOING} />);
    await waitFor(() => expect(resultCalls()).toBe(1));
    await settle();
    expect(cardIds()).toEqual([11, 12]);

    // 索引に載ったあと、操作しなくても次の取り直しで入る
    waiting.clear();
    await act(async () => {
      vi.advanceTimersByTime(90 * 1000);
    });

    await waitFor(() => expect(cardIds()).toEqual([1, 11, 12]));
    const settled = resultCalls();

    // 出さずにいる大会が無くなれば、取り直しは止まる
    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });
    expect(resultCalls()).toBe(settled);
  });

  // 索引に入らないまま終わる大会を永久に隠さない
  it("開催日が一昨日以前の大会は、分類待ちでも出す", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-10T21:00:00+09:00") });
    stubUpstream(
      () => [resultWithDeck(1, "2026-10-08", "P-1"), result(11, "2026-10-07"), result(12, "2026-10-07")],
      () => new Set(["P-1"]),
    );

    render(
      <CityleagueResults league_type={1} scheduleContext={{ ...ONGOING, startDate: "2026-10-08" }} />,
    );

    await waitFor(() => expect(cardIds()).toEqual([1]));
  });

  it("その日の大会が全部分類待ちなら、1ページ目は前の日から出す", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-08T21:00:00+09:00") });
    stubUpstream(
      () => [
        resultWithDeck(1, "2026-10-08", "P-1"),
        result(11, "2026-10-07"),
        result(12, "2026-10-07"),
      ],
      () => new Set(["P-1"]),
    );

    // サーバで取れなかったとき(ブラウザ側で1ページ目を探す)
    render(
      <CityleagueResults
        league_type={1}
        scheduleContext={{ ...ONGOING, startDate: "2026-10-08" }}
      />,
    );

    await waitFor(() => expect(cardIds()).toEqual([11, 12]));
  });

  it("選ばれていないタブは、アプリへ戻ってきても取りに行かない", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-08T12:00:00+09:00") });
    const calls = stubUpstream(() => INITIAL.results);
    const resultCalls = () => calls.filter((url) => url.includes("/api/cityleague_results?")).length;

    const { rerender } = render(
      <CityleagueResults league_type={1} initial={INITIAL} scheduleContext={ONGOING} />,
    );
    await waitFor(() => expect(resultCalls()).toBe(1));
    // マウント直後の取り直しが終わるまで待つ(途中で重なった要求は、その取り直しに吸収される)
    await settle();

    rerender(
      <CityleagueResults
        league_type={1}
        initial={INITIAL}
        scheduleContext={ONGOING}
        isActive={false}
      />,
    );
    vi.setSystemTime(new Date("2026-10-08T21:00:00+09:00"));
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await act(async () => {});
    expect(resultCalls()).toBe(1);

    // 選び直されたら取り直す
    rerender(<CityleagueResults league_type={1} initial={INITIAL} scheduleContext={ONGOING} />);
    await waitFor(() => expect(resultCalls()).toBe(2));
  });

  /*
   * 一覧の下のリンク集(最近開催されたシティリーグ)を見ているときは、カードがどれも画面より上にある。
   * 基準が無いと、スクロールアンカリングの無い iOS では差し込んだぶんだけ見ている所が下へずれる
   */
  it("カードがどれも画面より上にあっても、残るカードの位置を保って差し込む", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-08T21:00:00+09:00") });
    stubUpstream(() => [result(1, "2026-10-08"), result(11, "2026-10-07"), result(12, "2026-10-07")]);

    // カードは 500px ずつ並び、画面はその下(3000px 送った所)にある扱い
    const scrollY = 3000;
    vi.spyOn(window, "scrollY", "get").mockReturnValue(scrollY);
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      const el = this as HTMLElement;
      if (!el.dataset.officialEventId || !el.parentElement) {
        return { top: 0, bottom: 0, width: 0, height: 0 } as DOMRect;
      }
      const top = Array.from(el.parentElement.children).indexOf(el) * 500 - scrollY;
      return { top, bottom: top + 500, width: 300, height: 500 } as DOMRect;
    });
    // jsdom は scrollingElement が null で、scrollTop も書いても 0 のまま。補正で足された量を読めるようにする
    const scrolling = { scrollTop: 0 } as Element;
    Object.defineProperty(document, "scrollingElement", { value: scrolling, configurable: true });

    render(<CityleagueResults league_type={1} initial={INITIAL} scheduleContext={ONGOING} />);

    await waitFor(() => expect(cardIds()).toEqual([1, 11, 12]));
    // 1枚増えて最後のカード(12)が 500px 下がったぶん送る
    expect(scrolling.scrollTop).toBe(500);
    delete (document as { scrollingElement?: Element }).scrollingElement;
  });
});

describe("CityleagueResults の戻り先カードへのスクロール", () => {
  const ONGOING: CityleagueScheduleContext = {
    schedule: {
      id: "2027s1",
      title: "テストシーズン",
      from_date: new Date("2026-09-26T00:00:00+09:00"),
      to_date: new Date("2026-11-15T00:00:00+09:00"),
    } as CityleagueScheduleContext["schedule"],
    isOngoing: true,
    startDate: "2026-10-07",
  };
  const result = (id: number) =>
    ({
      official_event_id: id,
      league_type: 1,
      date: "2026-10-07T00:00:00+09:00",
    }) as unknown as CityleagueResultType;
  const INITIAL: CityleagueListInitialData = {
    ...ONGOING,
    results: [result(11), result(12)],
    events: [],
    deckArchetypes: {},
    nextFromDate: "2026-10-06",
    hasMore: true,
  };

  afterEach(() => {
    clearCityleagueResultScrollTarget();
  });

  it("表示中に書かれた対象は受け取らない(戻ってきた一覧のために残す)", async () => {
    stubFetch(["ok"]);
    vi.stubGlobal("scrollTo", vi.fn());
    render(<CityleagueResults league_type={1} initial={INITIAL} scheduleContext={ONGOING} />);
    await act(async () => {});

    // カードのリンクを押した直後(遷移が終わるまで一覧は画面に残っている)
    act(() => markCityleagueResultScrollTarget(12, 1));
    await act(async () => {});

    expect(sessionStorage.getItem("cityleagueResultScrollToId")).toBe("12");
  });

  it("戻ってきたときに既に書かれていた対象は受け取って消す", async () => {
    stubFetch(["ok"]);
    vi.stubGlobal("scrollTo", vi.fn());
    markCityleagueResultScrollTarget(12, 1);

    render(<CityleagueResults league_type={1} initial={INITIAL} scheduleContext={ONGOING} />);

    await waitFor(() => expect(sessionStorage.getItem("cityleagueResultScrollToId")).toBeNull());
  });

  /*
   * 上部のチップ(シーズン・環境・大型大会…)やヘッダーから離れて戻ったときも、元の位置で見せる。
   * jsdom は配置を計算しないので、カードは上端 300px から 500px ずつ並び、画面は scrollY だけ送った所にある扱い
   */
  function stubCardLayout(scrollY: number) {
    vi.spyOn(window, "scrollY", "get").mockReturnValue(scrollY);
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      const el = this as HTMLElement;
      if (!el.dataset.officialEventId || !el.parentElement) {
        return { top: 0, bottom: 0, width: 0, height: 0 } as DOMRect;
      }
      const top = 300 + Array.from(el.parentElement.children).indexOf(el) * 500 - scrollY;
      return { top, bottom: top + 500, width: 300, height: 500 } as DOMRect;
    });
  }

  const savedTarget = () => ({
    id: sessionStorage.getItem("cityleagueResultScrollToId"),
    leagueType: sessionStorage.getItem("cityleagueResultScrollToLeagueType"),
    savedAt: sessionStorage.getItem(CITYLEAGUE_SCROLL_TO_SAVED_AT_KEY),
  });

  it("どこから離れても、画面に見えているカードを時刻つきで控える", async () => {
    stubFetch(["ok"]);
    stubCardLayout(1000);
    const { unmount } = render(
      <CityleagueResults league_type={1} initial={INITIAL} scheduleContext={ONGOING} />,
    );
    await act(async () => {});

    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    unmount();

    // 1枚目(300〜800px)は画面の上へ抜け、2枚目(800px〜)が上端に掛かっている
    expect(savedTarget()).toMatchObject({ id: "12", leagueType: "1" });
    expect(savedTarget().savedAt).not.toBeNull();
    vi.restoreAllMocks();
  });

  /*
   * 戻ると一覧は1ページ目に戻り、控えたカードが出るまで続きを読む。最初のカードを控えると、
   * 画面の下側に見えていた続きのカードが読まれない
   */
  it("画面に複数のカードが見えているときは、最後のカードを控える", async () => {
    stubFetch(["ok"]);
    stubCardLayout(400);
    const { unmount } = render(
      <CityleagueResults league_type={1} initial={INITIAL} scheduleContext={ONGOING} />,
    );
    await act(async () => {});

    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    unmount();

    // 1枚目(-100〜400px)と2枚目(400〜900px)が画面に掛かっている
    expect(savedTarget()).toMatchObject({ id: "12" });
    vi.restoreAllMocks();
  });

  it("末尾のリンク集がこの離れ方を先に控えていたら、一覧は控えない", async () => {
    stubFetch(["ok"]);
    stubCardLayout(1000);
    const { unmount } = render(
      <CityleagueResults league_type={1} initial={INITIAL} scheduleContext={ONGOING} />,
    );
    await act(async () => {});
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    writeReturnTarget(CITYLEAGUE_LATEST_RETURN_KEY, "{}");
    unmount();

    expect(savedTarget().id).toBeNull();
    sessionStorage.removeItem(CITYLEAGUE_LATEST_RETURN_KEY);
    vi.restoreAllMocks();
  });

  it("先頭にいるときは控えない(戻っても先頭のまま)", async () => {
    stubFetch(["ok"]);
    stubCardLayout(0);
    const { unmount } = render(
      <CityleagueResults league_type={1} initial={INITIAL} scheduleContext={ONGOING} />,
    );
    await act(async () => {});

    unmount();

    expect(savedTarget().id).toBeNull();
    vi.restoreAllMocks();
  });

  it("カードから個別ページへ進んだときは、そのカードの控えを上書きしない", async () => {
    stubFetch(["ok"]);
    stubCardLayout(1000);
    const { unmount } = render(
      <CityleagueResults league_type={1} initial={INITIAL} scheduleContext={ONGOING} />,
    );
    await act(async () => {});
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    act(() => markCityleagueResultScrollTarget(11, 1));
    unmount();

    expect(savedTarget()).toEqual({ id: "11", leagueType: "1", savedAt: null });
    vi.restoreAllMocks();
  });

  it("離れるときに控えた対象は、戻ってきたときに使う", async () => {
    stubFetch(["ok"]);
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    markCityleagueResultDeparture(12, 1, 120);
    await new Promise((resolve) => setTimeout(resolve, 2));
    noteReturnNavigation("/cityleague_results");
    stubCardLayout(0);

    render(<CityleagueResults league_type={1} initial={INITIAL} scheduleContext={ONGOING} />);

    await waitFor(() => expect(savedTarget().id).toBeNull());
    // 2枚目(今 800px)を控えた 120px に置く
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith({ top: 680, behavior: "auto" }));
    vi.restoreAllMocks();
  });

  it("現れる前から残っているカードの対象があっても、離れるときは画面に見えているカードを控える", async () => {
    stubFetch(["ok"]);
    vi.stubGlobal("scrollTo", vi.fn());
    // 別のリーグのタブでカードから進んだ残り物(このタブでは受け取らないので消えずに残る)
    markCityleagueResultScrollTarget(99, 3);
    stubCardLayout(1000);
    const { unmount } = render(
      <CityleagueResults league_type={1} initial={INITIAL} scheduleContext={ONGOING} />,
    );
    await act(async () => {});
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    unmount();

    expect(savedTarget()).toMatchObject({ id: "12", leagueType: "1" });
    expect(savedTarget().savedAt).not.toBeNull();
    vi.restoreAllMocks();
  });

  it("別のリーグのタブで離れるときに控えた対象は、残り物として消す", async () => {
    stubFetch(["ok"]);
    markCityleagueResultDeparture(99, 3, 120);
    await new Promise((resolve) => setTimeout(resolve, 2));
    noteReturnNavigation("/cityleague_results");

    render(<CityleagueResults league_type={1} initial={INITIAL} scheduleContext={ONGOING} />);

    await waitFor(() => expect(savedTarget().id).toBeNull());
  });

  it("離れるときに控えた対象でも、戻ってきたのでなければ(開き直した)使わずに消す", async () => {
    stubFetch(["ok"]);
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    markCityleagueResultDeparture(12, 1, 120);

    render(<CityleagueResults league_type={1} initial={INITIAL} scheduleContext={ONGOING} />);

    await waitFor(() => expect(savedTarget().id).toBeNull());
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
