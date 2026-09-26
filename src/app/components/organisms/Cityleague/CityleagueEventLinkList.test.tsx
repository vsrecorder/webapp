// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import CityleagueEventLinkList from "@app/components/organisms/Cityleague/CityleagueEventLinkList";

import { OfficialEventType } from "@app/types/official_event";

const EVENTS = [
  {
    id: 1115269,
    date: "2026-09-25T15:00:00Z",
    shop_name: "ブックオフプラス佐賀南部バイパス店",
    prefecture_name: "佐賀県",
    league_title: "オープン",
  },
  {
    id: 1115148,
    date: "2026-09-25T15:00:00Z",
    shop_name: "カードショップ楓",
    prefecture_name: "高知県",
    league_title: "オープン",
  },
] as unknown as OfficialEventType[];

afterEach(cleanup);

describe("CityleagueEventLinkList", () => {
  it("開催日ごとに見出しを立て、会場ごとに個別ページへリンクする", () => {
    render(<CityleagueEventLinkList events={EVENTS} />);

    // 上流は JST 0:00 を UTC に直した値で返す。JST の暦日で見出しにする
    expect(screen.getByRole("heading", { name: "2026年9月26日" })).toBeTruthy();
    expect(screen.getByText("2件")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /ブックオフプラス佐賀南部バイパス店/ }).getAttribute("href"),
    ).toBe("/cityleague_results/1115269");
  });

  it("見出しから開催日ページへリンクする", () => {
    render(<CityleagueEventLinkList events={EVENTS} />);

    expect(
      screen.getByRole("link", { name: /この日の結果をまとめて見る/ }).getAttribute("href"),
    ).toBe("/cityleague_results/dates/2026-09-26");
  });

  // 開催日ページ自身で使うときは、自分へのリンクになるので出さない
  it("showDateLink={false} なら開催日ページへのリンクを出さない", () => {
    render(<CityleagueEventLinkList events={EVENTS} showDateLink={false} />);

    expect(screen.queryByRole("link", { name: /この日の結果をまとめて見る/ })).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});
