import { describe, expect, it } from "vitest";

import { deckIdentitySprites, deckUsageRowKey } from "@app/types/deck_usage_stat";

describe("deckUsageRowKey", () => {
  const dusknoir = [
    { id: "0887", position: 1 },
    { id: "0477", position: 2 },
  ];
  const charizard = [
    { id: "0887", position: 1 },
    { id: "0006", position: 2 },
  ];

  it("同じデッキでもスプライトの組み合わせが違えば別の鍵になる", () => {
    // split_by_sprites=true の集計は、相棒を入れ替えた前後を同じ deck_id の別の行で返す
    expect(deckUsageRowKey({ deck_id: "d1", pokemon_sprites: dusknoir })).not.toBe(
      deckUsageRowKey({ deck_id: "d1", pokemon_sprites: charizard }),
    );
  });

  it("並び順が違っても同じ枠・同じスプライトなら同じ鍵になる", () => {
    expect(deckUsageRowKey({ deck_id: "d1", pokemon_sprites: dusknoir })).toBe(
      deckUsageRowKey({ deck_id: "d1", pokemon_sprites: [...dusknoir].reverse() }),
    );
  });

  it("デッキが違えば別の鍵になり、スプライトの無い行も鍵を持つ", () => {
    expect(deckUsageRowKey({ deck_id: "d1", pokemon_sprites: [] })).toBe("d1|");
    expect(deckUsageRowKey({ deck_id: "d1", pokemon_sprites: dusknoir })).not.toBe(
      deckUsageRowKey({ deck_id: "d2", pokemon_sprites: dusknoir }),
    );
  });

  it("deck_id の無い行(「その他」など)は空を返し、呼び出し側が別の鍵を当てる", () => {
    expect(deckUsageRowKey({ deck_id: "", pokemon_sprites: [] })).toBe("");
  });
});

describe("deckIdentitySprites", () => {
  const usedInPeriod = [{ id: "0477", position: 2 }];
  const current = [{ id: "0006", position: 2 }];

  it("いまのデッキのスプライトを返す(期間中に使ったバージョンのものではなく)", () => {
    expect(
      deckIdentitySprites({ pokemon_sprites: usedInPeriod, deck_pokemon_sprites: current }),
    ).toEqual(current);
  });

  it("いまのデッキにスプライトが無ければ空を返す(期間中のもので埋めない)", () => {
    expect(
      deckIdentitySprites({ pokemon_sprites: usedInPeriod, deck_pokemon_sprites: [] }),
    ).toEqual([]);
  });

  it("古いバックエンド(項目なし)では行のスプライトを使い、未選択なら空を返す", () => {
    expect(deckIdentitySprites({ pokemon_sprites: usedInPeriod })).toEqual(usedInPeriod);
    expect(deckIdentitySprites(undefined)).toEqual([]);
  });
});
