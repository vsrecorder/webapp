// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TemplateUserReportIndex from "@app/components/templates/UserReportIndex";
import { markReportIndexReturn, reportTileAnchorId } from "@app/utils/reportIndexReturn";
import { noteReturnNavigation } from "@app/utils/returnNavigation";

/*
 * 各期間のレポートから戻ってきたとき、控えから一覧を描くこと。裏の取り直しに失敗しても、
 * 表示中の一覧をエラー表示に替えない(替えると見ていた一覧が消えて先頭へ飛ぶ)。
 */

vi.mock("@app/components/organisms/Report/RecapPeriodTile", () => ({
  default: ({ id, title }: { id?: string; title: string }) => <a id={id}>{title}</a>,
  gridTileColorIndex: (index: number) => index + 1,
}));

const MONTH = { year_month: "2020-01", total_matches: 5, win_rate: 0.6 };
const SAVED = { history: [MONTH], environmentStats: [], lastWeekStat: null };

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  window.history.replaceState(null, "", "/users/report");
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

const failAll = () => fetchMock.mockResolvedValue({ ok: false, json: async () => null });

describe("TemplateUserReportIndex", () => {
  it("戻ってきたら控えから描き、裏の取り直しに失敗しても一覧を出し続ける", async () => {
    // 控えより後に、この一覧へ戻ってきた(時刻は固定して前後をはっきりさせる)
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000);
    markReportIndexReturn({ userId: "u1", anchorId: reportTileAnchorId("month-2020-01"), data: SAVED });
    now.mockReturnValue(2_000);
    noteReturnNavigation();
    now.mockRestore();
    failAll();
    // 取得の失敗は useSeededResource が console.error に出す。それを失敗が届いた合図にする
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<TemplateUserReportIndex userId="u1" />);

    // 最初の描画から控えの一覧が出ている(取得中の表示を挟まない)
    expect(screen.getByText("2020年1月")).toBeTruthy();
    expect(screen.queryByText("バトルレポートを集めています")).toBeNull();

    // 裏で取り直したが失敗した。その結果の描画まで流してから確かめる
    await waitFor(() => expect(errorLog).toHaveBeenCalled());
    await act(async () => {});

    expect(screen.getByText("2020年1月")).toBeTruthy();
    expect(screen.queryByText("バトルレポートを取得できませんでした")).toBeNull();
  });

  it("普通に開いて取得に失敗したらエラーを出す", async () => {
    failAll();
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(<TemplateUserReportIndex userId="u1" />);

    expect(await screen.findByText("バトルレポートを取得できませんでした")).toBeTruthy();
  });
});
