// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import DeckArchetypeLabel from "@app/components/molecules/DeckArchetypeLabel";

afterEach(() => {
  cleanup();
});

describe("DeckArchetypeLabel", () => {
  it("主デッキ名と型を、スプライト 2 枠の下に出す(ギャラリー表示と同じ形)", () => {
    const { container } = render(
      <DeckArchetypeLabel
        archetype={{
          deckCode: "a-1",
          archetypeName: "ドラパルトex",
          variantName: "バシャーモ型",
          label: "ドラパルトex バシャーモ型",
          sprites: ["0887", "0257"],
        }}
      />,
    );

    expect(screen.getByText("ドラパルトex")).toBeTruthy();
    expect(screen.getByText("バシャーモ型")).toBeTruthy();
    expect(screen.queryByText("デッキ名：不明")).toBeNull();

    // スプライト → 名前 → 型 の順に上から並ぶ
    const spriteTop = container.querySelector("img")!;
    const name = screen.getByText("ドラパルトex");
    const variant = screen.getByText("バシャーモ型");
    expect(spriteTop.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(name.compareDocumentPosition(variant) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(name.nextElementSibling).toBe(variant);

    const srcs = [...container.querySelectorAll("img")].map((img) => img.getAttribute("src"));
    expect(srcs).toEqual([
      "https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/887.png",
      "https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/257.png",
    ]);
  });

  it("型を持たない主デッキは名前だけ、1 体の定義は 2 枠目が unknown", () => {
    const { container } = render(
      <DeckArchetypeLabel
        archetype={{
          deckCode: "a-1",
          archetypeName: "イワパレス",
          variantName: null,
          label: "イワパレス",
          sprites: ["0558"],
        }}
      />,
    );

    const name = screen.getByText("イワパレス");
    expect(name).toBeTruthy();
    // 型が無くても型の行は空のまま残す(同じ大会の中でカードの高さを揃えるため)
    const variantLine = name.nextElementSibling as HTMLElement;
    expect(variantLine.textContent).toBe("");
    expect(variantLine.className).toContain("h-4");

    const srcs = [...container.querySelectorAll("img")].map((img) => img.getAttribute("src"));
    expect(srcs).toEqual([
      "https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/558.png",
      "https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png",
    ]);
  });

  it("未分類は unknown の 2 枠と「デッキ名：不明」で出す", () => {
    const { container } = render(
      <DeckArchetypeLabel
        archetype={{
          deckCode: "a-1",
          archetypeName: null,
          variantName: null,
          label: null,
          sprites: [],
        }}
      />,
    );

    const name = screen.getByText("デッキ名：不明");
    expect(name).toBeTruthy();
    expect((name.nextElementSibling as HTMLElement).className).toContain("h-4");
    expect(container.querySelectorAll("img")).toHaveLength(2);
    expect(
      [...container.querySelectorAll("img")].every((img) =>
        img.getAttribute("src")?.endsWith("/unknown.png"),
      ),
    ).toBe(true);
  });
});
