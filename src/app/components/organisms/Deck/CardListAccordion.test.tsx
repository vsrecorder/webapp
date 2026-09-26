// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CardListAccordion from "@app/components/organisms/Deck/CardListAccordion";

// 開いたときの中身(取得を伴う)は差し替えて、どちらが描かれたかだけを見る
vi.mock("@app/components/organisms/Deck/DeckCardDetailRow", () => ({
  default: ({ code }: { code: string }) => <div data-testid="detail-row">{code}</div>,
}));

const CODE = "abc123-def456-ghi789";

// vitest の globals を有効にしていないため、自動 cleanup が効かない
afterEach(cleanup);

describe("CardListAccordion", () => {
  it("開くまで中身を描かない(カード内訳を取りに行かない)", () => {
    render(<CardListAccordion code={CODE} />);

    expect(screen.queryByTestId("detail-row")).toBeNull();
  });

  it("開くと通常のカードリストを出す", () => {
    render(<CardListAccordion code={CODE} />);

    fireEvent.click(screen.getByRole("button", { name: "カードリスト" }));

    expect(screen.getByTestId("detail-row").textContent).toBe(CODE);
  });

  /*
   * カルーセル(Swiper)の中に置いたとき、展開した中身(カード画像の行・タブ)を横に
   * スクロールすると、外側の Swiper が次のカードへ送られていた(入賞デッキカードに置いていた頃)。
   * swiper-no-swiping の付いた要素の中からは Swiper がスワイプを始めない。
   */
  it("展開した中身では外側のカルーセル(Swiper)がスワイプを始めない", () => {
    render(<CardListAccordion code={CODE} />);

    fireEvent.click(screen.getByRole("button", { name: "カードリスト" }));

    expect(screen.getByTestId("detail-row").closest(".swiper-no-swiping")).not.toBeNull();
    // 開閉ボタンには付けない(閉じているときはこれまでどおりカルーセルを送れる)
    expect(
      screen.getByRole("button", { name: "カードリスト" }).closest(".swiper-no-swiping"),
    ).toBeNull();
  });


  /*
   * カルーセルの中で閉じた見出しの上から横にスワイプすると、外側の Swiper がスライドを指ごと
   * 動かすので、離した時点でも指は見出しの上にあり「押された」と判定されて開いていた。
   */
  it("見出しの上でスワイプした操作では開かない", () => {
    render(<CardListAccordion code={CODE} />);
    const trigger = screen.getByRole("button", { name: "カードリスト" });

    fireEvent.pointerDown(trigger, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(trigger, { clientX: 60, clientY: 100 });
    fireEvent.click(trigger);

    expect(screen.queryByTestId("detail-row")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("指ぶれ程度の動きならタップとして開く", () => {
    render(<CardListAccordion code={CODE} />);
    const trigger = screen.getByRole("button", { name: "カードリスト" });

    fireEvent.pointerDown(trigger, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(trigger, { clientX: 92, clientY: 103 });
    fireEvent.click(trigger);

    expect(screen.getByTestId("detail-row")).toBeTruthy();
  });

  // スワイプの記録を持ち越して、次のキーボード操作まで無視しないこと
  it("スワイプの後でもキーボードでは開ける", () => {
    render(<CardListAccordion code={CODE} />);
    const trigger = screen.getByRole("button", { name: "カードリスト" });

    fireEvent.pointerDown(trigger, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(trigger, { clientX: 40, clientY: 100 });
    fireEvent.click(trigger);
    expect(screen.queryByTestId("detail-row")).toBeNull();

    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.keyUp(trigger, { key: "Enter" });

    expect(screen.getByTestId("detail-row")).toBeTruthy();
  });
});

