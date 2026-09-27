import { describe, expect, it } from "vitest";

import { DeckArchetypeType } from "@app/types/deck_archetype";
import { summarizeDateWinners } from "@app/utils/cityleagueDateShare";

const archetype = (
  name: string | null,
  variant: string | null,
  sprites: string[],
): DeckArchetypeType => ({
  deckCode: "x",
  archetypeName: name,
  variantName: variant,
  label: name ? [name, variant].filter(Boolean).join(" ") : null,
  sprites,
});

describe("summarizeDateWinners", () => {
  it("主デッキ(型は束ねる)ごとに数え、多い順・同数は名前順に並べる", () => {
    const result = summarizeDateWinners(
      [
        archetype("ドラパルトex", "バシャーモ型", ["0887", "0257"]),
        archetype("ドラパルトex", "ノココッチ型", ["0887", "0982"]),
        archetype("イワパレス", null, ["0558"]),
        archetype("ばけがくれ", null, ["0781", "0354"]),
        archetype("ドラパルトex", "カーストボム型", ["0887"]),
        archetype("イワパレス", null, ["0558"]),
      ],
      3,
    );

    expect(result).toEqual([
      { name: "ドラパルトex", spriteId: "0887", wins: 3 },
      { name: "イワパレス", spriteId: "0558", wins: 2 },
      { name: "ばけがくれ", spriteId: "0781", wins: 1 },
    ]);
  });

  it("分類の無いデッキと未分類は数えない", () => {
    expect(
      summarizeDateWinners([undefined, archetype(null, null, []), archetype("イワパレス", null, ["0558"])], 4),
    ).toEqual([{ name: "イワパレス", spriteId: "0558", wins: 1 }]);
  });

  it("上限の件数で切る", () => {
    const many = ["A", "B", "C", "D", "E"].map((n) => archetype(n, null, []));
    expect(summarizeDateWinners(many, 4)).toHaveLength(4);
  });
});
