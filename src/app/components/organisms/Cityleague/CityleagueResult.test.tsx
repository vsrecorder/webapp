// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CityleagueResult from "@app/components/organisms/Cityleague/CityleagueResult";

import { CityleagueResultType } from "@app/types/cityleague_result";
import { OfficialEventListItemType } from "@app/types/official_event";

// Swiper そのものはここでは試さない。作られたかどうかだけを見る
vi.mock("swiper/react", () => ({
  Swiper: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="swiper">{children}</div>
  ),
  SwiperSlide: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("swiper/modules", () => ({ A11y: {}, Pagination: {} }));
vi.mock("@app/components/organisms/Cityleague/CityleagueResultCard", () => ({
  default: ({ result }: { result: { rank: number } }) => (
    <div data-testid="slide">{result.rank}位</div>
  ),
}));

const EVENT = {
  id: 1,
  title: "シティリーグ2027 シーズン1",
  date: new Date("2026-10-18T00:00:00+09:00"),
  shop_name: "会場",
  league_title: "オープン",
  prefecture_name: "東京都",
  environment_title: "環境",
} as unknown as OfficialEventListItemType;

const EVENT_RESULT = {
  cityleague_schedule_id: "2027s1",
  official_event_id: 1,
  league_type: 1,
  date: new Date("2026-10-18T00:00:00+09:00"),
  results: [1, 2, 3].map((rank) => ({
    player_id: String(rank),
    player_name: "選手",
    rank,
    point: 0,
    deck_code: "",
  })),
} as unknown as CityleagueResultType;

// 交差の通知を手で送れる IntersectionObserver
let intersect: () => void = () => {};
class FakeIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    intersect = () =>
      callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
  }
  observe() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CityleagueResult の deferSwiper", () => {
  it("画面に近づくまでは Swiper を作らず、優勝の1枚だけを同じ形で置く", () => {
    const { container } = render(
      <CityleagueResult event_result={EVENT_RESULT} official_event={EVENT} deferSwiper />,
    );

    expect(screen.queryByTestId("swiper")).toBeNull();
    expect(screen.getAllByTestId("slide").map((slide) => slide.textContent)).toEqual(["1位"]);
    // Swiper のサーバ描画と同じ入れ子(差し替えても見た目が変わらないように)
    expect(container.querySelector(".swiper > .swiper-wrapper > .swiper-slide")).not.toBeNull();
    expect(container.querySelector(".swiper > .swiper-pagination")).not.toBeNull();
  });

  it("画面に近づいたら Swiper に差し替え、2位以下も並べる", () => {
    render(<CityleagueResult event_result={EVENT_RESULT} official_event={EVENT} deferSwiper />);

    act(() => intersect());

    expect(screen.getByTestId("swiper")).toBeTruthy();
    expect(screen.getAllByTestId("slide").map((slide) => slide.textContent)).toEqual([
      "1位",
      "2位",
      "3位",
    ]);
  });

  it("指定しなければ最初から Swiper を作る(一覧の既定)", () => {
    render(<CityleagueResult event_result={EVENT_RESULT} official_event={EVENT} />);

    expect(screen.getByTestId("swiper")).toBeTruthy();
  });
});
