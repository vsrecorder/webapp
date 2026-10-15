// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import WindowedSelect from "@app/components/molecules/Select/WindowedSelect";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type Option = { value: string; label: string };

const options = (count: number): Option[] =>
  Array.from({ length: count }, (_, i) => ({ value: String(i), label: `候補${i}` }));

function renderSelect(count: number) {
  render(
    <WindowedSelect<Option>
      instanceId="windowed-select-test"
      options={options(count)}
      windowThreshold={100}
      maxMenuHeight={485}
      formatOptionLabel={(option) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={option.label} src={`https://example.com/${option.value}.png`} />
      )}
    />,
  );

  // react-select は下矢印でメニューを開く
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });

  return screen.getAllByRole("option");
}

const firstImage = () => screen.getAllByRole("option")[0].querySelector("img");

describe("WindowedSelect", () => {
  /*
   * react-windowed-select は描画のたびに行の部品を作り直していたため、フォーカスが
   * 移るだけで見えている行の <img> が全部作り直され、アイコンがちらついていた。
   */
  it.each([50, 150])("%i件: 別の候補にフォーカスが移っても行の画像を作り直さない", (count) => {
    const rows = renderSelect(count);
    const before = firstImage();

    fireEvent.mouseMove(rows[1]);
    fireEvent.mouseOver(rows[1]);

    expect(rows[1].getAttribute("aria-selected")).not.toBeNull();
    expect(firstImage()).toBe(before);
    expect(before?.isConnected).toBe(true);
  });

  it("絞り込んでも残った候補の画像は作り直さない", () => {
    renderSelect(150);
    const target = screen.getByAltText("候補12");

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "候補12" } });

    expect(screen.getByAltText("候補12")).toBe(target);
  });

  /*
   * 行は作り直されないので、高さはマウント時だけでなく描画のたびに測る。
   * 測れていないと見積もり(35px)のまま並び、背の高い候補が重なる。
   */
  it("測った行の高さで並べ、フォーカスが移っても保つ", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      height: 90,
    } as DOMRect);

    const rows = renderSelect(150);
    const tops = () =>
      screen
        .getAllByRole("option")
        .slice(0, 3)
        .map((row) => (row.parentElement?.parentElement as HTMLElement).style.top);

    // menuList の上の余白(4px)の分だけ下げて並ぶ
    expect(tops()).toEqual(["4px", "94px", "184px"]);

    fireEvent.mouseMove(rows[2]);
    fireEvent.mouseOver(rows[2]);

    expect(tops()).toEqual(["4px", "94px", "184px"]);
  });
});
