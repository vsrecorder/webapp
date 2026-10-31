// @vitest-environment jsdom
import { DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/dropdown";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Dropdown } from "@app/components/atoms/AppDropdown";
import { OVERLAY_BACKDROP_MARK } from "@app/utils/closingBackdrop";

afterEach(cleanup);

function renderMenu(props: Partial<React.ComponentProps<typeof Dropdown>> = {}) {
  render(
    <Dropdown {...props}>
      <DropdownTrigger>
        <button type="button">開く</button>
      </DropdownTrigger>
      <DropdownMenu aria-label="操作">
        <DropdownItem key="a">項目A</DropdownItem>
      </DropdownMenu>
    </Dropdown>,
  );
  return screen.getByText("開く");
}

const backdrop = () => document.querySelector<HTMLElement>(`.${OVERLAY_BACKDROP_MARK}`);

describe("AppDropdown", () => {
  it("指定が無ければ、開いたとき透明な全面の層(目印付き)が出る", async () => {
    fireEvent.click(renderMenu());
    await waitFor(() => expect(screen.getByRole("menu")).toBeTruthy());

    const el = backdrop();
    expect(el).not.toBeNull();
    expect(el?.className).toContain("bg-transparent");
    expect(el?.className).not.toContain("bg-overlay/50");
  });

  it("opaque を明示したら暗幕はそのまま", async () => {
    fireEvent.click(renderMenu({ backdrop: "opaque" }));
    await waitFor(() => expect(screen.getByRole("menu")).toBeTruthy());

    const el = backdrop();
    expect(el?.className).toContain("bg-overlay/50");
    expect(el?.className).not.toContain("bg-transparent");
  });

  it("閉じ始めたら層を触れなくし、呼び出し側の onOpenChange も呼ぶ", async () => {
    const onOpenChange = vi.fn();
    fireEvent.click(renderMenu({ onOpenChange }));
    await waitFor(() => expect(screen.getByRole("menu")).toBeTruthy());
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    const el = backdrop();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    await waitFor(() => expect(onOpenChange).toHaveBeenLastCalledWith(false));
    expect(el?.style.pointerEvents).toBe("none");
  });
});
