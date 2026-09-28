import { describe, expect, it } from "vitest";

import { DeckArchetypeType } from "@app/types/deck_archetype";

import { cityleagueEventOgName, eventOgWinner } from "./cityleagueEventOg";

function archetype(overrides: Partial<DeckArchetypeType> = {}): DeckArchetypeType {
  return {
    deckCode: "abc",
    archetypeName: "ドラパルトex",
    variantName: "バシャーモ型",
    label: "ドラパルトex バシャーモ型",
    sprites: ["887", "257", "1"],
    ...overrides,
  };
}

describe("eventOgWinner", () => {
  it("主デッキ名・型名・先頭 2 体のスプライトを取り出す", () => {
    expect(eventOgWinner(archetype())).toEqual({
      name: "ドラパルトex",
      variant: "バシャーモ型",
      spriteIds: ["887", "257"],
    });
  });

  it("型が無ければ variant は null", () => {
    expect(eventOgWinner(archetype({ variantName: null }))?.variant).toBeNull();
  });

  it("名前の空白を 1 つに詰める", () => {
    expect(eventOgWinner(archetype({ archetypeName: " リザードン  ex " }))?.name).toBe(
      "リザードン ex",
    );
  });

  it("分類が無い・未分類なら null", () => {
    expect(eventOgWinner(undefined)).toBeNull();
    expect(
      eventOgWinner(archetype({ archetypeName: null, variantName: null, label: null, sprites: [] })),
    ).toBeNull();
  });
});

describe("cityleagueEventOgName", () => {
  it("優勝デッキが無ければ従来のキー", () => {
    expect(cityleagueEventOgName(1115603, null)).toBe("cityleague_results/1115603");
  });

  it("優勝デッキがあれば中身ごとに別のキーになる", () => {
    const winner = eventOgWinner(archetype())!;
    const name = cityleagueEventOgName(1115603, winner);

    expect(name).toMatch(/^cityleague_results\/1115603-w2-[0-9a-f]{12}$/);
    // 同じ中身なら同じキー(描き直さない)
    expect(cityleagueEventOgName(1115603, { ...winner })).toBe(name);
    // 型やスプライトが変われば別のキー
    expect(cityleagueEventOgName(1115603, { ...winner, variant: null })).not.toBe(name);
    expect(cityleagueEventOgName(1115603, { ...winner, spriteIds: ["887"] })).not.toBe(name);
  });
});
