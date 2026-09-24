// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import FetchErrorBox from "@app/components/molecules/FetchErrorBox";

describe("FetchErrorBox", () => {
  afterEach(() => cleanup());

  it("型枠は敷くが、目にも読み上げにも出さない", () => {
    const { container } = render(
      <FetchErrorBox sizer={<div>骨格の中身</div>} onRetry={vi.fn()} />,
    );

    // 高さを作るためだけに残す。見える形で「骨格の中身」を出してはいけない
    const frame = screen.getByText("骨格の中身").closest("[aria-hidden]");
    expect(frame).toBeTruthy();
    expect(frame?.className).toContain("invisible");
    expect(screen.getByRole("button", { name: "再読み込み" })).toBeTruthy();
    // 型枠とエラーを同じセルに重ねる(absolute だと型枠より高い中身がはみ出す)
    expect(container.firstElementChild?.className).toContain("grid");
  });

  it("children を渡す形では、正常時はそのまま描く", () => {
    render(
      <FetchErrorBox failed={false} onRetry={vi.fn()}>
        <div>正常の中身</div>
      </FetchErrorBox>,
    );

    expect(screen.getByText("正常の中身")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "再読み込み" })).toBeNull();
    expect(screen.getByText("正常の中身").closest("[aria-hidden]")).toBeNull();
  });

  it("children を渡す形では、失敗時はそれを型枠にしてエラーを重ねる", () => {
    const onRetry = vi.fn();
    render(
      <FetchErrorBox failed message="取れませんでした" onRetry={onRetry}>
        <div>正常の中身</div>
      </FetchErrorBox>,
    );

    expect(screen.getByText("取れませんでした")).toBeTruthy();
    expect(screen.getByText("正常の中身").closest("[aria-hidden]")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "再読み込み" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("stack では、再読み込みボタンを文の下に置く", () => {
    render(<FetchErrorBox sizer={<div />} message="取れませんでした" variant="stack" onRetry={vi.fn()} />);

    // 文(とアイコン)の行とボタンが縦に並ぶ: ボタンは文の行の兄弟で、親は縦並び
    const line = screen.getByText("取れませんでした").parentElement;
    const button = screen.getByRole("button", { name: "再読み込み" });
    expect(line?.nextElementSibling).toBe(button);
    expect(line?.parentElement?.className).toContain("flex-col");
  });
});
