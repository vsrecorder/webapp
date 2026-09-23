// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import UserStatPanel from "@app/components/organisms/UserStat/UserStatPanel";

// jsdom は ResizeObserver を持たない(HeroUI の Tabs が使う)
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const stat = {
  total_records: 12,
  total_matches: 30,
  wins: 20,
  losses: 10,
  win_rate: 0.666,
  official_event_count: 3,
  tonamel_event_count: 1,
  unofficial_event_count: 8,
};

function renderPanel() {
  return render(
    <UserStatPanel
      userId="u1"
      environments={[]}
      standardRegulations={[]}
      championshipSeries={[]}
      sectionTitle="戦績"
    />,
  );
}

describe("UserStatPanel", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("取得に失敗したら 0 を並べず、取り直しを出す", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        call++;
        if (call === 1) return { ok: false, status: 500 } as Response;
        return { ok: true, json: async () => stat } as Response;
      }),
    );

    renderPanel();

    // 失敗を stat=null のまま描くと「対戦記録 0 / 勝利 0 / 敗北 0」になり、
    // まだ記録が無いユーザーと見分けが付かない
    await waitFor(() =>
      expect(screen.getByText("戦績を取得できませんでした")).toBeTruthy(),
    );
    /*
     * 数値グリッドは高さを揃えるための型枠として残るが、目には見えない
     * (FetchErrorBox が aria-hidden + invisible で敷く)。0 が読める形では出さない。
     */
    const frame = screen.getByText("対戦記録").closest("[aria-hidden]");
    expect(frame).toBeTruthy();
    expect(frame?.className).toContain("invisible");
    // 中身が無いのでシェアも押させない
    expect(screen.getByRole("button", { name: "シェア" }).hasAttribute("disabled")).toBe(
      true,
    );

    fireEvent.click(screen.getByRole("button", { name: "再読み込み" }));

    await waitFor(() =>
      expect(screen.queryByText("戦績を取得できませんでした")).toBeNull(),
    );
    // 型枠ではなく、そのまま読める数値グリッドに戻る
    expect(screen.getByText("対戦記録").closest("[aria-hidden]")).toBeNull();
  });
});
