// @vitest-environment jsdom
import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RecordStatPanel from "@app/components/organisms/Record/Hero/RecordStatPanel";

import { summarizeMatches } from "@app/utils/matchStats";
import { MatchGetResponseType } from "@app/types/match";

// 集計に効くフラグだけを持つ対戦。summarizeMatches は他の項目を見ない
const match = (flags: Partial<MatchGetResponseType>) =>
  ({
    victory_flg: false,
    draw_flg: false,
    group_match_flg: false,
    group_match_victory_flg: false,
    ...flags,
  }) as unknown as MatchGetResponseType;

/*
 * 自動 cleanup は入っていない(vitest の globals を有効にしていないため、
 * @testing-library/react が afterEach を登録できない)。前のテストの描画が
 * document に残るので、document 全体を見る screen ではなく container の中で探す。
 */
describe("RecordStatPanel", () => {
  it("対戦結果が1件も無くてもパネルを描き、勝率は「-」にする", () => {
    const { container } = render(<RecordStatPanel stats={summarizeMatches([])} />);
    const panel = within(container);

    // 勝率0%として描くと全敗と読めてしまうため、数字ではなく「-」を出す
    expect(panel.getByText("-")).toBeTruthy();
    expect(panel.queryByText("0%")).toBeNull();
    // リングが勝ち負けの色を持たない状態であることを読み上げにも出す
    expect(panel.getByLabelText("勝率なし")).toBeTruthy();
    // 勝敗タイルは 0-0 のまま残す(対戦を足したときに構造が変わらないようにする)
    expect(panel.getByText("勝")).toBeTruthy();
    expect(panel.getByText("敗")).toBeTruthy();
  });

  it("引き分けだけの記録も勝率は「-」にする", () => {
    // 勝率は引き分けを分母から外すので、この記録に勝率は無い。
    // 0% と描くと全敗と見分けが付かない
    const stats = summarizeMatches([match({ draw_flg: true })]);

    const { container } = render(<RecordStatPanel stats={stats} />);
    const panel = within(container);

    expect(panel.getByText("-")).toBeTruthy();
    expect(panel.queryByText("0%")).toBeNull();
    expect(panel.getByLabelText("勝率なし")).toBeTruthy();
    // 内訳は 0勝0敗1分
    expect(panel.getByText("分")).toBeTruthy();
  });

  it("対戦結果があれば従来どおり勝率と勝敗数を出す", () => {
    const stats = summarizeMatches([
      match({ victory_flg: true }),
      match({ victory_flg: true }),
      match({ victory_flg: false }),
    ]);

    const { container } = render(<RecordStatPanel stats={stats} />);
    const panel = within(container);

    expect(panel.getByText("67%")).toBeTruthy();
    expect(panel.getByLabelText("勝率 67パーセント")).toBeTruthy();
    expect(panel.queryByText("-")).toBeNull();
  });

  it("対戦一覧の取得に失敗したら、勝敗も「-」にする", () => {
    // 取得できていないと集計は 0勝0敗 になる。そのまま描くと対戦0件の記録と
    // 見分けが付かないため、数字を持っていないことを「-」で示す
    const { container } = render(<RecordStatPanel stats={summarizeMatches([])} error />);
    const panel = within(container);

    // 勝率リングと勝/敗タイルの3か所
    expect(panel.getAllByText("-").length).toBe(3);
    expect(panel.queryByText("0")).toBeNull();
  });
});
