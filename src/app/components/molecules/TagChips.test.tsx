// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import TagChips from "@app/components/molecules/TagChips";

import { TagType } from "@app/types/tag";

const TAG: TagType = {
  id: "tag-1",
  created_at: new Date("2026-09-01T00:00:00Z"),
  name: "たねポケモン",
  color: "",
  text_color: "",
  preset_flg: false,
};

afterEach(() => cleanup());

describe("TagChips", () => {
  it("タグが無ければ何も描かない", () => {
    const { container } = render(<TagChips tags={[]} />);
    expect(container.firstChild).toBeNull();

    const { container: nullContainer } = render(<TagChips tags={null} />);
    expect(nullContainer.firstChild).toBeNull();
  });

  it("reserveSpace ならタグが無くてもチップ1行ぶん(h-5)の枠を残す", () => {
    // デッキ一覧のカードは、タグの有無でカードの高さが変わらないようにこの枠に頼っている。
    // 枠ごと消えると、タグ付きのデッキだけカードが 24px 高くなり、骨格とも食い違う。
    const { container } = render(<TagChips tags={[]} reserveSpace />);
    const placeholder = container.firstElementChild as HTMLElement;
    expect(placeholder).not.toBeNull();
    expect(placeholder.className).toContain("h-5");
    // 中身が無い枠なので読み上げの対象にしない
    expect(placeholder.getAttribute("aria-hidden")).toBe("true");
    expect(placeholder.textContent).toBe("");
  });

  it("枠にも className をそのまま渡す(中央寄せなどの指定が効く)", () => {
    const { container } = render(
      <TagChips tags={[]} reserveSpace className="justify-center" />,
    );
    expect((container.firstElementChild as HTMLElement).className).toContain(
      "justify-center",
    );
  });

  it("タグがあればチップを並べる(reserveSpace の有無で変わらない)", () => {
    const { container } = render(<TagChips tags={[TAG]} reserveSpace />);
    expect(container.textContent).toContain("たねポケモン");
  });
});
