import { describe, expect, it } from "vitest";

import {
  formatEventDateShort,
  parseSimilarDecksResponse,
  readSimilarDecksBody,
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
      placements: 0,
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
      // entryId の無い古い応答はデッキコードと大会日で代える
      entryId: "pRyy3y-SSokZ3-SMySp3|2026-09-26T00:00:00+09:00",
      sameCode: false,
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

  it("同じデッキコードの入賞は、大会ごとに別の行として entryId・sameCode・入賞件数を読む", () => {
    const row = body.similar[0];
    const withSameCode = {
      ...body,
      source: { ...body.source, origin: "cityleague", placements: 2 },
      similar: [
        { ...row, deckCode: "6QQngg", entryId: "2027s1_1_a", similarity: 1, sameCode: true },
        { ...row, deckCode: "6QQngg", entryId: "2027s1_2_b", similarity: 1, sameCode: true },
        row,
      ],
    };

    const parsed = parseSimilarDecksResponse(withSameCode);

    expect(parsed?.source.placements).toBe(2);
    expect(parsed?.similar.map((d) => [d.entryId, d.sameCode])).toEqual([
      ["2027s1_1_a", true],
      ["2027s1_2_b", true],
      ["pRyy3y-SSokZ3-SMySp3|2026-09-26T00:00:00+09:00", false],
    ]);
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

describe("readSimilarDecksBody", () => {
  it("BFF が返した形(parse 済み)を読んでも、デッキ名とスプライトが残る", () => {
    // BFF は parseSimilarDecksResponse の結果を JSON にして返す
    const bff = JSON.parse(JSON.stringify(parseSimilarDecksResponse(body)));

    const read = readSimilarDecksBody(bff);

    expect(read?.source.archetype).toEqual({
      archetypeId: "dragapult",
      label: "ドラパルトex バシャーモ型",
      sprites: ["0887", "0257"],
    });
    expect(read?.similar[0].archetype.label).toBe("ドラパルトex バシャーモ型");
    expect(read?.similar[0].archetype.sprites).toEqual(["0887", "0257"]);
  });

  it("parse 済みの形をもう一度 parseSimilarDecksResponse に通すと種類が消える(使ってはいけない理由)", () => {
    const bff = JSON.parse(JSON.stringify(parseSimilarDecksResponse(body)));

    expect(parseSimilarDecksResponse(bff)?.source.archetype.label).toBeNull();
  });

  it("形が違えば null", () => {
    expect(readSimilarDecksBody(null)).toBeNull();
    expect(readSimilarDecksBody({ error: "x" })).toBeNull();
    expect(readSimilarDecksBody(body)).toBeNull();
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
