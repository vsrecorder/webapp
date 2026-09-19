// @vitest-environment jsdom
import type { ReactNode } from "react";

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
