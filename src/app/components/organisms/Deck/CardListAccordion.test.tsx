// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CardListAccordion from "@app/components/organisms/Deck/CardListAccordion";

import { DeckSummaryType } from "@app/types/deckcard";

// 開いたときの中身(取得を伴う)は差し替えて、どちらが描かれたかだけを見る
vi.mock("@app/components/organisms/Deck/DeckCardDetailRow", () => ({
  default: ({ code }: { code: string }) => <div data-testid="detail-row">{code}</div>,
}));

const SUMMARY: DeckSummaryType = {
  code: "abc123-def456-ghi789",
  total: 60,
  mainPokemon: ["ドラパルトex"],
  aceSpec: "プライムキャッチャー",
  groups: [
    {
      label: "ポケモン",
      count: 16,
      cards: [
        { name: "ドラパルトex", count: 3 },
        { name: "ドロンチ", count: 3 },
      ],
    },
  ],
};

// vitest の globals を有効にしていないため、自動 cleanup が効かない
afterEach(cleanup);

describe("CardListAccordion", () => {
  it("要約を渡すと、開く前からテキスト版のカードリストを HTML に載せる", () => {
    const { container } = render(
      <CardListAccordion code={SUMMARY.code} summary={SUMMARY} />,
    );

    expect(within(container).getByText("ドラパルトex ×3、ドロンチ ×3")).toBeTruthy();
    expect(within(container).getByText("プライムキャッチャー")).toBeTruthy();
    // 画面に出ないテキストなので、スクリーンリーダーには読ませない
    expect(container.querySelector("dl")?.getAttribute("aria-hidden")).toBe("true");
    // 開く前はカード内訳を取りに行かない
    expect(screen.queryByTestId("detail-row")).toBeNull();
  });

  it("要約が無ければ、開くまで中身を描かない", () => {
    const { container } = render(<CardListAccordion code={SUMMARY.code} />);

    expect(container.querySelector("dl")).toBeNull();
    expect(screen.queryByTestId("detail-row")).toBeNull();
  });

  it("開くとテキスト版は通常のカードリストに置き換わる", () => {
    const { container } = render(
      <CardListAccordion code={SUMMARY.code} summary={SUMMARY} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "カードリスト" }));

    expect(screen.getByTestId("detail-row").textContent).toBe(SUMMARY.code);
    expect(container.querySelector("dl")).toBeNull();
  });

  /*
   * 大会結果の入賞デッキカードは Swiper で横に並ぶ。展開した中身(カード画像の行・タブ)を
   * 横にスクロールすると、外側の Swiper が次のカードへ送られていた。
   * swiper-no-swiping の付いた要素の中からは Swiper がスワイプを始めない。
   */
  it("展開した中身では外側のカルーセル(Swiper)がスワイプを始めない", () => {
    render(<CardListAccordion code={SUMMARY.code} />);

    fireEvent.click(screen.getByRole("button", { name: "カードリスト" }));

    expect(screen.getByTestId("detail-row").closest(".swiper-no-swiping")).not.toBeNull();
    // 開閉ボタンには付けない(閉じているときはこれまでどおりカルーセルを送れる)
    expect(
      screen.getByRole("button", { name: "カードリスト" }).closest(".swiper-no-swiping"),
    ).toBeNull();
  });

  it("押せない状態では開かず、タップは親へ渡す", () => {
    const onParentClick = vi.fn();
    render(
      <div onClick={onParentClick}>
        <CardListAccordion code="" isDisabled />
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "カードリスト" }));

    expect(screen.queryByTestId("detail-row")).toBeNull();
    expect(onParentClick).toHaveBeenCalledTimes(1);
  });
});
