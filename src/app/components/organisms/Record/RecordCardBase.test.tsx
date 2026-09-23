// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import RecordCardBase from "@app/components/organisms/Record/RecordCardBase";

// jsdom は ResizeObserver を持たない。イベント名を流す ScrollingText が使う
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

type Props = React.ComponentProps<typeof RecordCardBase>;

function renderCard(overrides: Partial<Props> = {}) {
  const onClick = vi.fn();
  const view = render(
    <RecordCardBase
      cardId="record-card-r1"
      onClick={onClick}
      accentColorClass="bg-default-400"
      date="2026/09/24(木)"
      title="テストイベント"
      loadingTitle={false}
      icon={<span />}
      deckName="リザードンex"
      loadingDeck={false}
      loadingMatches={false}
      regulationId={1}
      {...overrides}
    />,
  );
  return { ...view, onClick };
}

describe("RecordCardBase の勝敗バッジ", () => {
  afterEach(() => cleanup());

  it("対戦が0件なら「対戦なし」を出す", () => {
    renderCard({ winCount: 0, lossCount: 0, drawCount: 0 });

    expect(screen.getByText("対戦なし")).toBeTruthy();
    expect(screen.queryByLabelText("対戦結果を再読み込みする")).toBeNull();
  });

  it("勝敗があれば勝敗数を出す", () => {
    renderCard({ winCount: 2, lossCount: 1, drawCount: 0 });

    expect(screen.getByText(/2勝/)).toBeTruthy();
    expect(screen.queryByText("対戦なし")).toBeNull();
  });

  it("取得に失敗したら「対戦なし」ではなく取り直しを出す", () => {
    // 0勝0敗として描くと、対戦を持つ記録に「対戦なし」と言うことになる
    renderCard({ matchesError: true, onRetryMatches: vi.fn() });

    expect(screen.queryByText("対戦なし")).toBeNull();
    expect(screen.getByLabelText("対戦結果を再読み込みする")).toBeTruthy();
  });

  it("取り直しを押しても、カード(記録モーダル)は開かない", () => {
    const onRetryMatches = vi.fn();
    const { onClick } = renderCard({ matchesError: true, onRetryMatches });

    fireEvent.click(screen.getByLabelText("対戦結果を再読み込みする"));

    expect(onRetryMatches).toHaveBeenCalledTimes(1);
    // カード全体が onClick を持つため、伝播を止めないとモーダルが開いてしまう
    expect(onClick).not.toHaveBeenCalled();
  });
});
