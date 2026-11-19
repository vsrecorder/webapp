// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import ShareDeckHeading from "@app/components/molecules/Share/ShareDeckHeading";

afterEach(cleanup);

describe("ShareDeckHeading", () => {
  it("デッキを選んでいなければ「すべての使用デッキ」と出す", () => {
    render(<ShareDeckHeading deck={null} />);

    expect(screen.getByText("すべての使用デッキ")).toBeTruthy();
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("デッキを選んでいればスプライト2枠とデッキ名を出す", () => {
    render(
      <ShareDeckHeading
        deck={{ name: "リザードンex", spriteIds: ["0006", undefined], hasSprite: true }}
      />,
    );

    // 1枠目は図鑑番号、無い2枠目は unknown のまま枠を保つ
    expect(screen.getAllByRole("img").map((img) => img.getAttribute("alt"))).toEqual([
      "6",
      "unknown",
    ]);
    expect(screen.getByText("『リザードンex』")).toBeTruthy();
    expect(screen.getByText("使用時")).toBeTruthy();
  });

  it("スプライトが1体も無いデッキではデッキ名だけ出す", () => {
    render(
      <ShareDeckHeading
        deck={{ name: "名前だけ", spriteIds: [undefined, undefined], hasSprite: false }}
      />,
    );

    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.getByText("『名前だけ』")).toBeTruthy();
  });
});
