// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CityleagueResults from "@app/components/organisms/Cityleague/CityleagueResults";

import { CityleagueResultType } from "@app/types/cityleague_result";
import {
  clearCityleagueResultScrollTarget,
  markCityleagueResultScrollTarget,
} from "@app/utils/cityleagueScrollRestore";
import {
  CityleagueListInitialData,
  CityleagueScheduleContext,
} from "@app/utils/cityleagueListServer";

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

  const INITIAL: CityleagueListInitialData = {
    ...ONGOING,
    results: [result(11, "2026-10-07"), result(12, "2026-10-07")],
    events: [],
    deckArchetypes: {},
    nextFromDate: "2026-10-06",
    hasMore: true,
  };

  // 範囲指定の取得には、その時点で登録されている結果を返す
  function stubUpstream(registered: () => CityleagueResultType[]) {
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
});
