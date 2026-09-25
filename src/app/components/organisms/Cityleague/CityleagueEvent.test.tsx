// @vitest-environment jsdom
import type { ReactNode } from "react";

import { renderToString } from "react-dom/server";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CityleagueEvent from "@app/components/organisms/Cityleague/CityleagueEvent";

// カルーセル本体はここの関心事ではない。中身をそのまま描くだけの箱に置き換える
vi.mock("swiper/react", () => ({
  Swiper: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SwiperSlide: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("swiper/modules", () => ({ A11y: {}, Autoplay: {}, Pagination: {} }));
vi.mock("swiper/css", () => ({}));
vi.mock("swiper/css/navigation", () => ({}));
vi.mock("swiper/css/pagination", () => ({}));
vi.mock("swiper/css/scrollbar", () => ({}));
// 骨格が出ているかだけを見たいので、目印付きの箱に置き換える
vi.mock("@app/components/organisms/Cityleague/Skeleton/CityleagueEventSkeleton", () => ({
  default: () => <div data-testid="event-skeleton" />,
}));

const EMPTY_EVENTS = { count: 0, official_events: [] };

/* 公式イベント一覧の成否を制御する。結果(cityleague_results)は常に空で返す */
function stubFetch(responses: (typeof EMPTY_EVENTS | null)[]) {
  let call = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("/api/official_events")) {
        const body = responses[Math.min(call, responses.length - 1)];
        call += 1;
        return body
          ? Response.json(body)
          : new Response('{"message":"error"}', { status: 500 });
      }
      return Response.json({ count: 0, event_results: [] });
    }),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CityleagueEvent の取得失敗", () => {
  // 失敗しても「本日の開催はありません」にはならず、以前は枠ごと何も出なかった
  it("失敗を「本日の開催はありません」と区別して表示する", async () => {
    stubFetch([null]);
    render(<CityleagueEvent league_type={1} setLeagueTypeCount={() => {}} />);

    await waitFor(() =>
      expect(screen.getByText("本日の開催情報を取得できませんでした")).toBeTruthy(),
    );
    expect(screen.queryByText("本日の開催はありません")).toBeNull();
  });

  it("開催が無いときは従来どおり空状態を出す", async () => {
    stubFetch([EMPTY_EVENTS]);
    render(<CityleagueEvent league_type={1} setLeagueTypeCount={() => {}} />);

    await waitFor(() => expect(screen.getByText("本日の開催はありません")).toBeTruthy());
    expect(screen.queryByText("本日の開催情報を取得できませんでした")).toBeNull();
  });

  it("「再読み込み」で取り直せる", async () => {
    stubFetch([null, EMPTY_EVENTS]);
    render(<CityleagueEvent league_type={1} setLeagueTypeCount={() => {}} />);

    await waitFor(() =>
      expect(screen.getByText("本日の開催情報を取得できませんでした")).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: /再読み込み/ }));

    await waitFor(() => expect(screen.getByText("本日の開催はありません")).toBeTruthy());
  });
});

describe("CityleagueEvent の想定外の応答", () => {
  it("200 で配列でない応答が返っても落ちない", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ message: "error" })),
    );
    render(<CityleagueEvent league_type={1} setLeagueTypeCount={() => {}} />);

    await waitFor(() => expect(screen.getByText("本日の開催はありません")).toBeTruthy());
  });
});

describe("CityleagueEvent の日付指定(開催期間外の先出しプレビュー)", () => {
  // date を渡すと「今日」ではなくその日付で問い合わせる。開催期間外に次シーズン初日を
  // 先出し表示するときに使う
  it("渡した日付で公式イベントを取得する", async () => {
    const requestedUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        requestedUrls.push(url);
        if (url.includes("/api/official_events")) return Response.json(EMPTY_EVENTS);
        return Response.json({ count: 0, event_results: [] });
      }),
    );

    render(
      <CityleagueEvent league_type={1} setLeagueTypeCount={() => {}} date="2026-09-26" />,
    );

    await waitFor(() => expect(screen.getByText("この日の開催はありません")).toBeTruthy());
    expect(requestedUrls.some((url) => url.includes("date=2026-09-26"))).toBe(true);
  });

  // 「本日」の文言のままだと、数日先のプレビューなのに今日の話に見えてしまう
  it("取得失敗の文言が「本日」ではなく「この日」になる", async () => {
    stubFetch([null]);
    render(
      <CityleagueEvent league_type={1} setLeagueTypeCount={() => {}} date="2026-09-26" />,
    );

    await waitFor(() =>
      expect(screen.getByText("この日の開催情報を取得できませんでした")).toBeTruthy(),
    );
    expect(screen.queryByText("本日の開催情報を取得できませんでした")).toBeNull();
  });
});

describe("CityleagueEvent の最初の描画", () => {
  /*
   * サーバ描画(とハイドレーション直後)は effect が走る前の状態で描かれる。
   * 取得中フラグが false で始まっていた頃は、ここがスライド0枚の空の Swiper になり、
   * ホームをリロードするとパネルが一度潰れてから骨格・実体の順に伸びて揺れていた。
   */
  it("取得を始める前の描画から骨格を出す", () => {
    const html = renderToString(
      <CityleagueEvent league_type={1} setLeagueTypeCount={() => {}} />,
    );

    expect(html).toContain('data-testid="event-skeleton"');
  });
});
