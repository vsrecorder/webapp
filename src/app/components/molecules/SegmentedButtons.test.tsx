// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SegmentedButtons from "@app/components/molecules/SegmentedButtons";

const OPTIONS = [
  { key: "list", label: "リスト" },
  { key: "gallery", label: "ギャラリー" },
] as const;

describe("SegmentedButtons", () => {
  it("group では aria-pressed で選択中を示し、押すと onChange にキーを渡す", () => {
    const onChange = vi.fn();
    render(<SegmentedButtons options={OPTIONS} value="list" onChange={onChange} ariaLabel="表示モード" />);

    const list = screen.getByRole("button", { name: "リスト" });
    const gallery = screen.getByRole("button", { name: "ギャラリー" });
    expect(list.getAttribute("aria-pressed")).toBe("true");
    expect(gallery.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(gallery);
    expect(onChange).toHaveBeenCalledWith("gallery");
  });

  it("radiogroup では radio ロールと aria-checked を使う", () => {
    render(
      <SegmentedButtons options={OPTIONS} value="gallery" onChange={() => {}} ariaLabel="デッキの状態" role="radiogroup" />,
    );

    expect(screen.getByRole("radiogroup", { name: "デッキの状態" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "ギャラリー" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "リスト" }).getAttribute("aria-checked")).toBe("false");
  });
});
