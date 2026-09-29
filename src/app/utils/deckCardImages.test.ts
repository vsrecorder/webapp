import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DeckCardDetailType } from "@app/types/deckcard";

import {
  clearDeckCardImageMapCache,
  deckCardImageMap,
  fetchDeckCardImageMap,
  findCardImageUrl,
  normalizeCardName,
} from "@app/utils/deckCardImages";

const IMAGE_BASE = "https://www.pokemon-card.com/assets/images/card_images/large";

function card(name: string, id: string) {
  return {
    card_id: id,
    card_name: name,
    card_count: 1,
    detail_url: `https://www.pokemon-card.com/card-search/details.php/card/${id}/`,
    image_url: `${IMAGE_BASE}/${id}.jpg`,
  };
}

// 内訳(/api/deckcards/{code}/detail)の形。同じ名前の絵柄違いを 2 枚入れてある
const detail = {
  card_pke: [card("ドラパルトex", "1"), card("ヨノワール", "2")],
  card_pke_count: 3,
  card_gds: [card("ネストボール", "3"), card("ネストボール", "4")],
  card_gds_count: 2,
  card_tool: [card("ロストスイーパー", "5")],
  card_tool_count: 1,
  card_tech: [],
  card_tech_count: 0,
  card_sup: [card("ボスの指令", "6")],
  card_sup_count: 1,
  card_sta: [],
  card_sta_count: 0,
  card_ene: [card("基本超エネルギー", "7")],
  card_ene_count: 1,
} as unknown as DeckCardDetailType;

describe("deckCardImageMap", () => {
  it("どのカテゴリーのカードも名前から引ける", () => {
    const map = deckCardImageMap(detail);

    expect(findCardImageUrl(map, "ドラパルトex")).toBe(`${IMAGE_BASE}/1.jpg`);
    expect(findCardImageUrl(map, "ロストスイーパー")).toBe(`${IMAGE_BASE}/5.jpg`);
    expect(findCardImageUrl(map, "ボスの指令")).toBe(`${IMAGE_BASE}/6.jpg`);
    expect(findCardImageUrl(map, "基本超エネルギー")).toBe(`${IMAGE_BASE}/7.jpg`);
  });

  it("同じ名前の絵柄違いは最初の 1 枚を代表にする", () => {
    const map = deckCardImageMap(detail);

    expect(findCardImageUrl(map, "ネストボール")).toBe(`${IMAGE_BASE}/3.jpg`);
  });

  it("内訳に無いカードは null(呼び出し側が文言を出す)", () => {
    const map = deckCardImageMap(detail);

    expect(findCardImageUrl(map, "かがやくゲッコウガ")).toBeNull();
  });

  /*
   * 突き合わせる 2 つの名前は出どころが違う(差分カードはバトラボのカードマスタ、内訳は
   * deckcard-api)。空白の入れ方や英字の大小だけで画像を出せなくならないようにする
   */
  it("空白と英字の大小の違いは無視して突き合わせる", () => {
    const map = deckCardImageMap(detail);

    expect(findCardImageUrl(map, "ドラパルトEX")).toBe(`${IMAGE_BASE}/1.jpg`);
    expect(findCardImageUrl(map, "基本 超 エネルギー")).toBe(`${IMAGE_BASE}/7.jpg`);
    expect(findCardImageUrl(map, "　ボスの指令 ")).toBe(`${IMAGE_BASE}/6.jpg`);
    expect(normalizeCardName("ドラパルト ex")).toBe("ドラパルトex");
  });

  // 形が崩れた応答(配列でないキー)でも、残りのカードは引けるようにする
  it("カテゴリーが欠けていても落ちない", () => {
    const map = deckCardImageMap({ card_pke: [card("ピカチュウ", "9")] } as DeckCardDetailType);

    expect(findCardImageUrl(map, "ピカチュウ")).toBe(`${IMAGE_BASE}/9.jpg`);
  });
});

describe("fetchDeckCardImageMap", () => {
  const code = "FkVdfF-xyOrPQ-FvbvdF";

  beforeEach(() => {
    clearDeckCardImageMapCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("同じデッキは覚えておき、二度は取りにいかない", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(detail), {
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      fetchDeckCardImageMap(code),
      fetchDeckCardImageMap(code),
    ]);
    const third = await fetchDeckCardImageMap(code);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(findCardImageUrl(first, "ヨノワール")).toBe(`${IMAGE_BASE}/2.jpg`);
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  // 失敗を覚えてしまうと、再読み込みを押しても二度と取りにいかなくなる
  it("失敗は覚えず、次の呼び出しで取り直す", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(detail), {
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchDeckCardImageMap(code)).rejects.toThrow();

    const map = await fetchDeckCardImageMap(code);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(findCardImageUrl(map, "ドラパルトex")).toBe(`${IMAGE_BASE}/1.jpg`);
  });
});
