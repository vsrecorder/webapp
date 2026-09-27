import { describe, expect, it } from "vitest";

import {
  formatEventDateShort,
  parseSimilarDecksResponse,
  similarDecksApiPath,
  spriteIdFromUrl,
  vslabArchetypePageUrl,
  vslabSimilarPageUrl,
} from "@app/utils/similarDecks";

const SPRITE_BASE = "https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites";

// バトラボの GET /api/similar が返す形(表示に要る項目だけ)
const body = {
  source: {
    deckCode: "FkVdfF-xyOrPQ-FvbvdF",
    origin: "external",
    environmentId: "m6a",
    environmentTitle: "30th CELEBRATION",
    asOf: "2026-09-27",
    deckType: {
      archetypeId: "dragapult",
      variantId: "blaziken",
      label: "ドラパルトex バシャーモ型",
      spriteUrls: [`${SPRITE_BASE}/887.png`, `${SPRITE_BASE}/257.png`],
    },
    deckTypeSkipped: false,
    cards: [{ name: "ドラパルトex", count: 2 }],
    unresolved: [],
  },
  similar: [
    {
      deckCode: "pRyy3y-SSokZ3-SMySp3",
      similarity: 0.935,
      eventDate: "2026-09-26T00:00:00+09:00",
      shopName: "店",
      prefectureName: "北海道",
      leagueName: "オープン",
      rank: 5,
      point: 40,
      diffIn: ["リーリエのピッピex"],
      diffOut: ["ふしぎなアメ", "アカマツ"],
      deckType: {
        archetypeId: "dragapult",
        variantId: "blaziken",
        label: "ドラパルトex バシャーモ型",
        spriteUrls: [`${SPRITE_BASE}/887.png`, `${SPRITE_BASE}/257.png`],
      },
      sameArchetype: true,
    },
  ],
  candidates: 109,
};

describe("spriteIdFromUrl", () => {
  it("先頭の 0 を落とした URL から 4 桁の図鑑 ID に戻す", () => {
    expect(spriteIdFromUrl(`${SPRITE_BASE}/887.png`)).toBe("0887");
    expect(spriteIdFromUrl(`${SPRITE_BASE}/25.png`)).toBe("0025");
    expect(spriteIdFromUrl(`${SPRITE_BASE}/1024.png`)).toBe("1024");
  });

  it("地方の姿などの後ろ付きはそのまま残す", () => {
    expect(spriteIdFromUrl(`${SPRITE_BASE}/25_alola.png`)).toBe("0025_alola");
  });

  it("形が違えば null", () => {
    expect(spriteIdFromUrl(`${SPRITE_BASE}/unknown.png`)).toBeNull();
    expect(spriteIdFromUrl("")).toBeNull();
  });
});

describe("parseSimilarDecksResponse", () => {
  it("検索元と一覧を表示用の形にし、スプライトは URL から ID に戻す", () => {
    const parsed = parseSimilarDecksResponse(body);

    expect(parsed).not.toBeNull();
    expect(parsed?.source).toEqual({
      deckCode: "FkVdfF-xyOrPQ-FvbvdF",
      origin: "external",
      environmentId: "m6a",
      environmentTitle: "30th CELEBRATION",
      archetype: {
        archetypeId: "dragapult",
        label: "ドラパルトex バシャーモ型",
        sprites: ["0887", "0257"],
      },
      archetypeSkipped: false,
      unresolved: [],
    });
    expect(parsed?.candidates).toBe(109);
    expect(parsed?.similar).toHaveLength(1);
    expect(parsed?.similar[0]).toMatchObject({
      deckCode: "pRyy3y-SSokZ3-SMySp3",
      similarity: 0.935,
      prefectureName: "北海道",
      rank: 5,
      diffIn: ["リーリエのピッピex"],
      diffOut: ["ふしぎなアメ", "アカマツ"],
      sameArchetype: true,
    });
    expect(parsed?.similar[0].archetype.sprites).toEqual(["0887", "0257"]);
  });

  it("応答に sprites(ID)が付いていればそちらを使う", () => {
    const withIds = {
      ...body,
      source: { ...body.source, deckType: { ...body.source.deckType, sprites: ["0887"] } },
    };

    expect(parseSimilarDecksResponse(withIds)?.source.archetype.sprites).toEqual(["0887"]);
  });

  it("未分類のデッキは種類が null でスプライトが空", () => {
    const unclassified = {
      ...body,
      source: {
        ...body.source,
        deckType: { archetypeId: null, variantId: null, label: null, spriteUrls: [] },
        deckTypeSkipped: true,
        unresolved: [{ name: "新弾のカード", count: 2 }],
      },
    };

    const parsed = parseSimilarDecksResponse(unclassified);

    expect(parsed?.source.archetype).toEqual({ archetypeId: null, label: null, sprites: [] });
    expect(parsed?.source.archetypeSkipped).toBe(true);
    expect(parsed?.source.unresolved).toEqual([{ name: "新弾のカード", count: 2 }]);
  });

  it("壊れた 1 件だけを落とし、残りは返す", () => {
    const broken = { ...body, similar: [{ deckCode: "" }, body.similar[0], "x"] };

    expect(parseSimilarDecksResponse(broken)?.similar).toHaveLength(1);
  });

  it("検索元が無い・形が違う応答は null", () => {
    expect(parseSimilarDecksResponse(null)).toBeNull();
    expect(parseSimilarDecksResponse({ error: "not found" })).toBeNull();
    expect(parseSimilarDecksResponse({ source: { deckCode: "" }, similar: [] })).toBeNull();
  });
});

describe("URL とパス", () => {
  it("BFF のパスはデッキコードをエンコードして組む", () => {
    expect(similarDecksApiPath("FkVdfF-xyOrPQ-FvbvdF")).toBe(
      "/api/deckcards/FkVdfF-xyOrPQ-FvbvdF/similar",
    );
  });

  it("バトラボの類似デッキ検索と種類ページへのリンクを組む", () => {
    expect(vslabSimilarPageUrl("FkVdfF-xyOrPQ-FvbvdF", "m6a")).toBe(
      "https://lab.vsrecorder.mobi/similar?deckCode=FkVdfF-xyOrPQ-FvbvdF&env=m6a",
    );
    expect(vslabArchetypePageUrl("dragapult", "m6a")).toBe(
      "https://lab.vsrecorder.mobi/archetypes/dragapult?env=m6a",
    );
  });
});

describe("formatEventDateShort", () => {
  it("大会日を JST の月/日にする", () => {
    expect(formatEventDateShort("2026-09-26T00:00:00+09:00")).toBe("9/26");
    expect(formatEventDateShort("")).toBe("");
  });
});
