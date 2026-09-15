// @vitest-environment jsdom
import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import UserStatSummary from "@app/components/molecules/UserStat/UserStatSummary";

import { UserStatType } from "@app/types/user_stat";

const stat = (over: Partial<UserStatType>): UserStatType =>
  ({
    user_id: "user-1",
    year_month: "2026-09",
    environment_id: "",
    season: "",
    regulation_id: "",
    total_records: 0,
    official_event_count: 0,
    tonamel_event_count: 0,
    unofficial_event_count: 0,
    total_matches: 0,
    wins: 0,
    losses: 0,
    win_rate: 0,
    ...over,
  }) as UserStatType;

/*
 * 自動 cleanup は入っていない(vitest の globals を有効にしていないため、
 * @testing-library/react が afterEach を登録できない)。前のテストの描画が
 * document に残るので、document 全体を見る screen ではなく container の中で探す。
 */
describe("UserStatSummary", () => {
  it("対戦がまだ無い期間は勝率を「-」にする", () => {
    const { container } = render(<UserStatSummary stat={stat({})} isLoading={false} />);
    const panel = within(container);

    // 0.0% と出すと全敗と見分けが付かない
    expect(panel.getByText("-")).toBeTruthy();
    expect(panel.queryByText("0.0")).toBeNull();
  });

  it("引き分けだけの期間も勝率を「-」にする", () => {
    const { container } = render(
      <UserStatSummary
        stat={stat({ total_records: 1, total_matches: 2 })}
        isLoading={false}
      />,
    );
    const panel = within(container);

    expect(panel.getByText("-")).toBeTruthy();
    expect(panel.queryByText("0.0")).toBeNull();
  });

  it("全敗は勝率 0.0% として出す(勝率が存在する)", () => {
    const { container } = render(
      <UserStatSummary
        stat={stat({ total_records: 1, total_matches: 3, losses: 3 })}
        isLoading={false}
      />,
    );
    const panel = within(container);

    expect(panel.getByText("0.0")).toBeTruthy();
    expect(panel.queryByText("-")).toBeNull();
  });

  it("勝ちがあれば従来どおり勝率を出す", () => {
    const { container } = render(
      <UserStatSummary
        stat={stat({ total_records: 4, total_matches: 10, wins: 6, losses: 4, win_rate: 0.6 })}
        isLoading={false}
      />,
    );

    expect(within(container).getByText("60.0")).toBeTruthy();
  });
});
