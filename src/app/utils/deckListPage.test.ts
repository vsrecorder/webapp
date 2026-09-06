import { describe, expect, it } from "vitest";

import { DeckGetResponseType, DeckType } from "@app/types/deck";
import { splitPeekedPage, stepDeckPage, toDeckPage } from "@app/utils/deckListPage";

describe("splitPeekedPage", () => {
  it("limit を超える件があれば次ページありとし、超えた先頭の1件を peek に返す", () => {
    const page = splitPeekedPage(["a", "b", "c", "d"], 3);
    expect(page.items).toEqual(["a", "b", "c"]);
    expect(page.hasNext).toBe(true);
    expect(page.peek).toBe("d");
  });

  it("ちょうど limit 件なら次ページなし", () => {
    const page = splitPeekedPage(["a", "b", "c"], 3);
    expect(page.items).toEqual(["a", "b", "c"]);
    expect(page.hasNext).toBe(false);
    expect(page.peek).toBeUndefined();
  });

  it("limit 未満・0件でもそのまま返す", () => {
    expect(splitPeekedPage(["a"], 3)).toEqual({ items: ["a"], hasNext: false, peek: undefined });
    expect(splitPeekedPage([], 3)).toEqual({ items: [], hasNext: false, peek: undefined });
  });

  it("limit+1 を超えて返ってきても表示ぶんは limit 件に切る", () => {
    const page = splitPeekedPage([1, 2, 3, 4, 5], 2);
    expect(page.items).toEqual([1, 2]);
    expect(page.peek).toBe(3);
  });
});

// テスト用のデッキ(id とカーソルだけ持つ)
const deck = (id: string, cursor = `c-${id}`): DeckType =>
  ({ cursor, data: { id } }) as unknown as DeckType;

const response = (decks: DeckType[], extra: Partial<DeckGetResponseType> = {}): DeckGetResponseType => ({
  limit: 10,
  offset: 0,
  cursor: "",
  decks,
  ...extra,
});

describe("toDeckPage", () => {
  it("limit+1 件あれば limit 件に切り、次ページありと次ページ先頭の id を付ける", () => {
    const page = toDeckPage(response([deck("a"), deck("b"), deck("c")]), 2);
    expect(page.decks.map((d) => d.data.id)).toEqual(["a", "b"]);
    expect(page.limit).toBe(2);
    expect(page.has_next).toBe(true);
    expect(page.next_first_id).toBe("c");
  });

  it("limit 件以下なら次ページなし", () => {
    const page = toDeckPage(response([deck("a")]), 2);
    expect(page.decks).toHaveLength(1);
    expect(page.has_next).toBe(false);
    expect(page.next_first_id).toBeUndefined();
  });

  it("decks が配列でない想定外の応答はそのまま返す(クライアントの検査に任せる)", () => {
    const broken = { error: "x" } as unknown as DeckGetResponseType;
    expect(toDeckPage(broken)).toBe(broken);
  });
});

describe("stepDeckPage", () => {
  it("取得済みのデッキは足さず、カーソルを最後の1件へ進める", () => {
    const step = stepDeckPage(
      response([deck("fav"), deck("a"), deck("b")], { has_next: true }),
      new Set(["fav"]),
      "",
    );
    expect(step.appended.map((d) => d.data.id)).toEqual(["a", "b"]);
    expect(step.nextCursor).toBe("c-b");
    expect(step.hasNext).toBe(true);
    expect(step.peekLoaded).toBe(false);
  });

  it("has_next が false なら続きなし", () => {
    const step = stepDeckPage(response([deck("a")], { has_next: false }), new Set(), "");
    expect(step.hasNext).toBe(false);
  });

  it("has_next が無い応答ではカーソルが進めば続きありとみなす", () => {
    expect(stepDeckPage(response([deck("a")]), new Set(), "").hasNext).toBe(true);
  });

  it("0件・カーソルが進まないときは続きなしとして打ち切り、カーソルは動かさない", () => {
    expect(stepDeckPage(response([]), new Set(), "c-x")).toEqual({
      appended: [],
      nextCursor: "c-x",
      hasNext: false,
      peekLoaded: false,
    });
    const stuck = stepDeckPage(response([deck("a", "c-x")], { has_next: true }), new Set(), "c-x");
    expect(stuck.hasNext).toBe(false);
    expect(stuck.nextCursor).toBe("c-x");
  });

  it("次ページの先頭が取得済み(繰り上げられたお気に入り)なら peekLoaded", () => {
    const step = stepDeckPage(
      response([deck("a")], { has_next: true, next_first_id: "fav" }),
      new Set(["fav"]),
      "",
    );
    expect(step.peekLoaded).toBe(true);
    expect(step.hasNext).toBe(true);
  });
});
