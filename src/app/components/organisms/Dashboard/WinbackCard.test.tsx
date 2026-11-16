// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WINBACK_DISMISSED_COOKIE } from "@app/utils/winback";

// 計測はカードの表示とは別物なので、描画の検証からは外す
vi.mock("@next/third-parties/google", () => ({ sendGAEvent: vi.fn() }));
const { sendDailyActivity } = vi.hoisted(() => ({ sendDailyActivity: vi.fn() }));
vi.mock("@app/utils/dailyActivity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@app/utils/dailyActivity")>()),
  sendDailyActivity,
}));

// 閉じたあとはサーバの構成(pinnedIds)を取り直す。呼ばれたことだけ見る
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

const WinbackCard = (await import("@app/components/organisms/Dashboard/WinbackCard")).default;

const props = {
  lastWeek: "2026-10-19",
  emptyWeeks: 5,
  environmentTitle: "ハドウシーカー",
  environmentFrom: "2026-11-27",
  lastEnvironment: { id: "m6a", title: "30th CELEBRATION" },
};

describe("WinbackCard", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    document.cookie = `${WINBACK_DISMISSED_COOKIE}=; Max-Age=0; Path=/`;
  });

  it("最後の対戦の週・空いた週数・いまの環境と、記録フォームへの導線を出す", () => {
    render(<WinbackCard {...props} />);

    expect(
      screen.getByRole("heading", { name: "最後の対戦は 10/19〜10/25 の週（5週間ぶり）" }),
    ).toBeTruthy();
    expect(screen.getByText("いまは『ハドウシーカー』環境です（11/27〜）")).toBeTruthy();
    // HeroUI の Button は as={Link} でも role="button" を付けるので、文言から <a> を引く
    expect(screen.getByText("今日の対戦を記録する").closest("a")?.getAttribute("href")).toBe(
      "/records/create",
    );
    expect(
      screen.getByRole("link", { name: /『30th CELEBRATION』のバトルレポート/ }).getAttribute("href"),
    ).toBe("/users/report/environments/m6a");
  });

  it("表示したら日次シグナル(winback_card)を送る", () => {
    render(<WinbackCard {...props} />);

    expect(sendDailyActivity).toHaveBeenCalledWith(["winback_card"]);
  });

  it("最後に対戦した環境がいまの環境と同じなら、レポートへの導線は出さない", () => {
    render(<WinbackCard {...props} lastEnvironment={null} />);

    expect(screen.queryByRole("link", { name: /バトルレポート/ })).toBeNull();
  });

  it("× で閉じると消え、7日間出さない cookie を書き、サーバの構成を取り直す", async () => {
    render(<WinbackCard {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "このカードを閉じる" }));

    await waitFor(() => {
      expect(screen.queryByRole("heading")).toBeNull();
    });
    expect(document.cookie).toContain(`${WINBACK_DISMISSED_COOKIE}=1`);
    expect(refresh).toHaveBeenCalled();
  });
});
