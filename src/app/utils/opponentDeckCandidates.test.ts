import { describe, expect, it } from "vitest";

import { toDeckHistories } from "@app/utils/opponentDeckCandidates";

describe("toDeckHistories", () => {
  it("上流の候補を表示用の形へ詰め替える", () => {
    const ret = toDeckHistories([
      {
        opponents_deck_info: "ロストバレット",
        pokemon_sprites: [
          { id: "0887", position: 1 },
          { id: "0006", position: 2 },
        ],
        count: 12,
      },
    ]);

    expect(ret).toHaveLength(1);
    expect(ret[0].deckInfo).toBe("ロストバレット");
    // 画像のファイル名はゼロ埋めなし
    expect(ret[0].sprite1?.id).toBe("0887");
    expect(ret[0].sprite1?.image_url).toContain("/887.png");
    expect(ret[0].sprite2?.image_url).toContain("/6.png");
  });

  it("スプライトが無い候補はnullになる", () => {
    const ret = toDeckHistories([
      { opponents_deck_info: "サーナイトex", pokemon_sprites: [], count: 3 },
    ]);

    expect(ret[0].sprite1).toBeNull();
    expect(ret[0].sprite2).toBeNull();
  });

  it("2体目だけの候補も表示枠を取り違えない", () => {
    const ret = toDeckHistories([
      {
        opponents_deck_info: "リザードンex",
        pokemon_sprites: [{ id: "0006", position: 2 }],
        count: 2,
      },
    ]);

    expect(ret[0].sprite1).toBeNull();
    expect(ret[0].sprite2?.id).toBe("0006");
  });

  // 並びは上流が出現回数順に決めている。ここで並び替えないこと
  it("上流の順序をそのまま保つ", () => {
    const ret = toDeckHistories([
      { opponents_deck_info: "A", pokemon_sprites: [], count: 1 },
      { opponents_deck_info: "B", pokemon_sprites: [], count: 99 },
    ]);

    expect(ret.map((h) => h.deckInfo)).toEqual(["A", "B"]);
  });

  it("未取得(undefined)は空配列を返す", () => {
    expect(toDeckHistories(undefined)).toEqual([]);
  });
});
