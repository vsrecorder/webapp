// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import CityleagueDateEventTabs from "@app/components/organisms/Cityleague/CityleagueDateEventTabs";

import { OfficialEventType } from "@app/types/official_event";

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

afterEach(() => cleanup());

describe("CityleagueDateEventTabs", () => {
  it("初期表示ではすべての会場を出す", () => {
    render(<CityleagueDateEventTabs events={EVENTS} />);

    expect(screen.getByText("オープン会場")).toBeTruthy();
    expect(screen.getByText("シニア会場")).toBeTruthy();
    expect(screen.getByText("ジュニア会場")).toBeTruthy();
  });

  it("タブに区分ごとの件数を出す", () => {
    render(<CityleagueDateEventTabs events={EVENTS} />);

    expect(screen.getByRole("tab", { name: "すべて 3件" })).toBeTruthy();
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

  it("「すべて」タブへ戻すと再び全件が出る", () => {
    render(<CityleagueDateEventTabs events={EVENTS} />);

    fireEvent.click(screen.getByRole("tab", { name: "シニア 1件" }));
    fireEvent.click(screen.getByRole("tab", { name: "すべて 3件" }));

    expect(screen.getByText("オープン会場")).toBeTruthy();
    expect(screen.getByText("シニア会場")).toBeTruthy();
    expect(screen.getByText("ジュニア会場")).toBeTruthy();
  });
});
