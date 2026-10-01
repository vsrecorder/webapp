import { describe, expect, it } from "vitest";

import { OpponentDeckType } from "@app/types/opponent_deck";
import {
  filterOpponentDecks,
  formatLastEventDate,
  normalizeForSearch,
  opponentDeckKey,
  sortOpponentDecks,
  specOfOpponentDeck,
  toOpponentDeckSpec,
} from "@app/utils/opponentDecks";

const deck = (
  info: string,
  count: number,
  sprites: { id: string; position: number }[] = [],
): OpponentDeckType => ({
  opponents_deck_info: info,
  pokemon_sprites: sprites,
  count,
  last_event_date: "2026-09-28",
});

const decks = [
  deck("ドラパルトex", 12, [{ id: "0887", position: 1 }]),
  deck("サーナイトex", 5),
  deck("ドラパ", 3),
  deck("ドラパルトex", 2),
];

describe("opponentDeckKey", () => {
  it("表記とスロット1/2のスプライトで組み合わせを見分ける", () => {
    expect(opponentDeckKey(decks[0])).toBe("ドラパルトex|0887|");
    expect(opponentDeckKey(decks[3])).toBe("ドラパルトex||");
    // 2体目だけのスプライト
    expect(opponentDeckKey(deck("サナ", 1, [{ id: "0282", position: 2 }]))).toBe(
      "サナ||0282",
    );
  });
});

describe("normalizeForSearch / filterOpponentDecks", () => {
  it("全角・半角、大文字・小文字、カタカナ・ひらがなの違いを無視する", () => {
    expect(normalizeForSearch("ﾄﾞﾗﾊﾟﾙﾄEX")).toBe(normalizeForSearch("どらぱるとex"));
  });

  it("表記に検索語を含むものだけを残す。空の検索語なら全件", () => {
    expect(filterOpponentDecks(decks, "どらぱ").map((d) => d.count)).toEqual([12, 3, 2]);
    expect(filterOpponentDecks(decks, " ")).toBe(decks);
  });
});

describe("sortOpponentDecks", () => {
  it("新しい順は最後に対戦した日の新しい順で、同じ日は対戦の多い順", () => {
    const dated = [
      { ...deck("A", 12), last_event_date: "2026-08-01" },
      { ...deck("B", 2), last_event_date: "2026-09-28" },
      { ...deck("C", 5), last_event_date: "2026-09-28" },
      { ...deck("D", 30), last_event_date: "2026-07-19" },
    ];
    expect(sortOpponentDecks(dated, "recent").map((d) => d.opponents_deck_info)).toEqual([
      "C",
      "B",
      "A",
      "D",
    ]);
  });

  it("件数順は上流の並びのまま", () => {
    expect(sortOpponentDecks(decks, "count")).toBe(decks);
  });

  it("名前順は表記ゆれが隣に並び、同じ表記は対戦の多い順", () => {
    expect(
      sortOpponentDecks(decks, "name").map((d) => `${d.opponents_deck_info}:${d.count}`),
    ).toEqual(["サーナイトex:5", "ドラパ:3", "ドラパルトex:12", "ドラパルトex:2"]);
  });
});

describe("toOpponentDeckSpec / specOfOpponentDeck", () => {
  const sprite = (id: string) => ({ id, name: "", image_url: "" });

  it("表記の前後の空白を落とし、選んだ枠だけを position 付きで送る", () => {
    expect(toOpponentDeckSpec(" ドラパルトex　", null, sprite("0006"))).toEqual({
      opponents_deck_info: "ドラパルトex",
      pokemon_sprites: [{ id: "0006", position: 2 }],
    });
    expect(
      toOpponentDeckSpec("ドラパルトex", sprite("0887"), sprite("0006")).pokemon_sprites,
    ).toEqual([
      { id: "0887", position: 1 },
      { id: "0006", position: 2 },
    ]);
  });

  it("置き換え元は一覧の表記とスプライトをそのまま使う", () => {
    expect(specOfOpponentDeck(decks[0])).toEqual({
      opponents_deck_info: "ドラパルトex",
      pokemon_sprites: [{ id: "0887", position: 1 }],
    });
  });
});

describe("formatLastEventDate", () => {
  it("YYYY-MM-DD を 2026/9/28 の形にする。読めない値は空文字", () => {
    expect(formatLastEventDate("2026-09-28")).toBe("2026/9/28");
    expect(formatLastEventDate("")).toBe("");
  });
});
