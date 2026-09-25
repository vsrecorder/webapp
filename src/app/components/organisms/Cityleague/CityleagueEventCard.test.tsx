// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CityleagueEventCard from "@app/components/organisms/Cityleague/CityleagueEventCard";

import { OfficialEventListItemType } from "@app/types/official_event";
import { CityleagueResultType } from "@app/types/cityleague_result";

// 結果の中身(Swiper など)はここの関心事ではない。出たかどうかだけを見る
vi.mock("@app/components/organisms/Cityleague/CityleagueResult", () => ({
  default: () => <div data-testid="result" />,
}));

const EVENT = {
  id: 1115145,
  title: "シティリーグ2027 シーズン1",
  address: "岐阜県可児市広見6-98",
  venue: "受付開始はイベント開始時間の30分前から",
  date: "2026-09-26T00:00:00+09:00",
  started_at: "2026-09-26T09:00:00+09:00",
  ended_at: "2026-09-26T00:00:00+09:00",
  type_id: 2,
  shop_name: "宝島可児店",
  prefecture_name: "岐阜県",
  league_title: "オープン",
  environment_title: "30th CELEBRATION",
} as unknown as OfficialEventListItemType;

afterEach(cleanup);

describe("CityleagueEventCard のタップ", () => {
  it("大会が終わっていなくても、タップで開催情報のモーダルを開く", async () => {
    render(<CityleagueEventCard event={EVENT} results={[]} />);

    fireEvent.click(screen.getByTitle("宝島可児店"));

    await waitFor(() => expect(screen.getByText("シティリーグの開催情報")).toBeTruthy());
    expect(screen.getByText("大会開始時間")).toBeTruthy();
    expect(screen.getByText("09:00")).toBeTruthy();
    // 住所と、会場名の欄の自由記述(補足)は出さない
    expect(screen.queryByText("岐阜県可児市広見6-98")).toBeNull();
    expect(screen.queryByText("受付開始はイベント開始時間の30分前から")).toBeNull();
    expect(screen.queryByTestId("result")).toBeNull();
    expect(screen.queryByText("大会終了")).toBeNull();
    // 公式サイトへの導線は置かない
    expect(screen.queryByText("公式サイトで大会の詳細を見る")).toBeNull();
    expect(document.querySelector('a[href*="players.pokemon-card.com"]')).toBeNull();
  });

  it("大会が終わっていれば、従来どおり結果のモーダルを開く", async () => {
    const results = [{ official_event_id: EVENT.id }] as unknown as CityleagueResultType[];
    render(<CityleagueEventCard event={EVENT} results={results} />);

    expect(screen.getByText("大会終了")).toBeTruthy();
    fireEvent.click(screen.getByTitle("宝島可児店"));

    await waitFor(() => expect(screen.getByText("シティリーグの結果発表！")).toBeTruthy());
    expect(screen.getByTestId("result")).toBeTruthy();
    expect(screen.queryByText("シティリーグの開催情報")).toBeNull();
  });

  // 並べている Swiper の自動スライドを、開いている間だけ止めるための知らせ
  it("モーダルの開閉を知らせる(マウント時は知らせない)", async () => {
    const onModalOpenChange = vi.fn();
    render(
      <CityleagueEventCard event={EVENT} results={[]} onModalOpenChange={onModalOpenChange} />,
    );
    expect(onModalOpenChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTitle("宝島可児店"));
    await waitFor(() => expect(onModalOpenChange).toHaveBeenLastCalledWith(true));

    fireEvent.click(screen.getByRole("button", { name: /close|閉じる/i }));
    await waitFor(() => expect(onModalOpenChange).toHaveBeenLastCalledWith(false));
    expect(onModalOpenChange).toHaveBeenCalledTimes(2);
  });
});

