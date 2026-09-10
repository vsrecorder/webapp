// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CityleagueOffSeasonCard from "@app/components/organisms/Cityleague/CityleagueOffSeasonCard";

import { CityleagueScheduleType } from "@app/types/cityleague_schedule";

// 上流(core-apiserver)は JST 0:00 を +09:00 付きで返す
const NEXT_SCHEDULE = {
  id: "2027s1",
  title: "シティリーグ2027 シーズン1",
  from_date: "2026-09-26T00:00:00+09:00",
  to_date: "2026-11-15T00:00:00+09:00",
} as unknown as CityleagueScheduleType;

describe("CityleagueOffSeasonCard", () => {
  it("次回シーズンの大会名と開催期間を出す", () => {
    render(<CityleagueOffSeasonCard next={NEXT_SCHEDULE} />);

    expect(screen.getByText("次回のシティリーグ")).toBeTruthy();
    expect(screen.getByText("シティリーグ2027 シーズン1")).toBeTruthy();
    // 日付は必ず JST で読む(UTC で読むと前日になる)
    expect(screen.getByText("2026年9月26日 〜 2026年11月15日")).toBeTruthy();
  });

  it("次回が未発表なら開催が無い旨だけを出す", () => {
    render(<CityleagueOffSeasonCard next={null} />);

    expect(screen.getByText("本日の開催はありません")).toBeTruthy();
    expect(screen.getByText("次回の開催予定が決まると、ここに表示します")).toBeTruthy();
  });

  /*
   * 期間外は中身が空に見えるため、何を出す場所なのかを次回の有無によらず明記する。
   *
   * 自動 cleanup は入っていない(vitest の globals を有効にしていないため、
   * @testing-library/react が afterEach を登録できない)。同じ文言を2回描くので、
   * document 全体を見る screen ではなく、それぞれの container の中で探す。
   */
  it("注意書きは次回の有無によらず出す", () => {
    const note = "開催期間中は大会結果が表示されます";

    const withNext = render(<CityleagueOffSeasonCard next={NEXT_SCHEDULE} />);
    expect(within(withNext.container).getByText(note)).toBeTruthy();

    const withoutNext = render(<CityleagueOffSeasonCard next={null} />);
    expect(within(withoutNext.container).getByText(note)).toBeTruthy();
  });
});
