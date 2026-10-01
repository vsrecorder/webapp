import { describe, expect, it } from "vitest";

import {
  environmentOnDate,
  isSimilarDecksAvailableOn,
  formatEventDateShort,
  parseSimilarDecksResponse,
  readSimilarDecksBody,
  similarDeckArchetypeName,
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
      archetypeName: "ドラパルトex",
      variantName: "バシャーモ型",
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
        archetypeName: "ドラパルトex",
        variantName: "バシャーモ型",
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
        archetypeName: "ドラパルトex",
        variantName: "バシャーモ型",
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
      sameList: false,
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

  it("同じカードリストの入賞は、コードが違っても大会ごとに別の行として entryId・sameList・入賞件数を読む", () => {
    const row = body.similar[0];
    const withSameList = {
      ...body,
      source: { ...body.source, origin: "cityleague", placements: 2 },
      similar: [
        {
          ...row,
          deckCode: "6QQngg",
          entryId: "2027s1_1_a",
          similarity: 1,
          sameList: true,
          sameCode: true,
        },
        // 同じリストを別のデッキコードで登録した入賞
        {
          ...row,
          deckCode: "k5wkbv",
          entryId: "2027s1_2_b",
          similarity: 1,
          sameList: true,
          sameCode: false,
        },
        row,
      ],
    };

    const parsed = parseSimilarDecksResponse(withSameList);

    expect(parsed?.source.placements).toBe(2);
    expect(parsed?.similar.map((d) => [d.entryId, d.sameList])).toEqual([
      ["2027s1_1_a", true],
      ["2027s1_2_b", true],
      ["pRyy3y-SSokZ3-SMySp3|2026-09-26T00:00:00+09:00", false],
    ]);
  });

  it("sameList の無い古い応答は、同じデッキコードの印(sameCode)で代える", () => {
    const row = body.similar[0];
    const old = {
      ...body,
      similar: [{ ...row, entryId: "a", similarity: 1, sameCode: true }, row],
    };

    expect(parseSimilarDecksResponse(old)?.similar.map((d) => d.sameList)).toEqual([true, false]);
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

    expect(parsed?.source.archetype).toEqual({
      archetypeId: null,
      archetypeName: null,
      variantName: null,
      label: null,
      sprites: [],
    });
    expect(parsed?.source.archetypeSkipped).toBe(true);
    expect(parsed?.source.unresolved).toEqual([{ name: "新弾のカード", count: 2 }]);
  });

  it("壊れた 1 件だけを落とし、残りは返す", () => {
    const broken = { ...body, similar: [{ deckCode: "" }, body.similar[0], "x"] };

    expect(parseSimilarDecksResponse(broken)?.similar).toHaveLength(1);
  });

  /*
   * 差分カードのタグをタップしたときの画像は、この表から引く。鍵は diffIn / diffOut の
   * 要素そのもので、「ドロンチ(ていさつしれい)」のように技名が付くこともある
   */
  it("カード名 → カード画像の表を読む", () => {
    const images = {
      "リーリエのピッピex": "https://www.pokemon-card.com/assets/images/card_images/large/a.jpg",
      "ドロンチ（ていさつしれい）": "https://www.pokemon-card.com/assets/images/card_images/large/b.jpg",
    };

    expect(parseSimilarDecksResponse({ ...body, images })?.images).toEqual(images);
  });

  // 画像として読み込めない値(URL でない・文字列でない)は落とす
  it("画像の表に混ざった読めない値は落とす", () => {
    const images = {
      よい: "https://www.pokemon-card.com/assets/images/card_images/large/a.jpg",
      わるい: "javascript:alert(1)",
      かず: 1,
    };

    expect(parseSimilarDecksResponse({ ...body, images })?.images).toEqual({
      よい: "https://www.pokemon-card.com/assets/images/card_images/large/a.jpg",
    });
  });

  // 画像の表を付ける前のバトラボの応答
  it("画像の表が無ければ空の表にする", () => {
    expect(parseSimilarDecksResponse(body)?.images).toEqual({});
  });

  /*
   * 差分カードに添えられた「そのデッキに入っている印刷」の画像。差分カードのタグを
   * タップしたときの画像はここから出す(images は種類の代表画像で絵柄が違うことがある)
   */
  it("差分カードの印刷の画像(cards.in / cards.out)を読む", () => {
    const row = body.similar[0];
    const withCards = {
      ...body,
      similar: [
        {
          ...row,
          cards: {
            in: [
              { key: "k1", name: "リーリエのピッピex", count: 2, imageUrl: "https://www.pokemon-card.com/a.jpg" },
            ],
            out: [
              { key: "k2", name: "ふしぎなアメ", count: 1, imageUrl: "https://www.pokemon-card.com/b.jpg" },
              // 索引に画像が無いカード。枚数を返す前の古い応答(count が無い)も混ぜる
              { key: "k3", name: "アカマツ", imageUrl: null },
            ],
          },
        },
      ],
    };

    expect(parseSimilarDecksResponse(withCards)?.similar[0].cards).toEqual({
      in: [{ name: "リーリエのピッピex", count: 2, imageUrl: "https://www.pokemon-card.com/a.jpg" }],
      out: [
        { name: "ふしぎなアメ", count: 1, imageUrl: "https://www.pokemon-card.com/b.jpg" },
        { name: "アカマツ", count: null, imageUrl: null },
      ],
    });
  });

  // cards を付ける前の古い応答は、diffIn / diffOut の名前だけで組む(画像は null)
  it("cards が無ければ diffIn / diffOut の名前だけの差分カードにする", () => {
    expect(parseSimilarDecksResponse(body)?.similar[0].cards).toEqual({
      in: [{ name: "リーリエのピッピex", count: null, imageUrl: null }],
      out: [
        { name: "ふしぎなアメ", count: null, imageUrl: null },
        { name: "アカマツ", count: null, imageUrl: null },
      ],
    });
  });

  it("差分カードの画像は http(s) の URL だけ、枚数の差は 1 以上の整数だけ通す", () => {
    const row = body.similar[0];
    const withCards = {
      ...body,
      similar: [
        {
          ...row,
          cards: {
            in: [
              { name: "リーリエのピッピex", count: -1, imageUrl: "javascript:alert(1)" },
              "壊れた要素",
              { imageUrl: "x" },
            ],
            out: [],
          },
        },
      ],
    };

    expect(parseSimilarDecksResponse(withCards)?.similar[0].cards).toEqual({
      in: [{ name: "リーリエのピッピex", count: null, imageUrl: null }],
      out: [],
    });
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
      archetypeName: "ドラパルトex",
      variantName: "バシャーモ型",
      label: "ドラパルトex バシャーモ型",
      sprites: ["0887", "0257"],
    });
    expect(read?.similar[0].archetype.label).toBe("ドラパルトex バシャーモ型");
    expect(read?.similar[0].archetype.sprites).toEqual(["0887", "0257"]);
  });

  // cards を付ける前の BFF の応答が Data Cache に残っていることがある
  it("cards の無い BFF の応答は、名前だけの差分カードを補って読む", () => {
    const bff = JSON.parse(JSON.stringify(parseSimilarDecksResponse(body)));
    delete bff.similar[0].cards;

    expect(readSimilarDecksBody(bff)?.similar[0].cards).toEqual({
      in: [{ name: "リーリエのピッピex", count: null, imageUrl: null }],
      out: [
        { name: "ふしぎなアメ", count: null, imageUrl: null },
        { name: "アカマツ", count: null, imageUrl: null },
      ],
    });
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

describe("similarDeckArchetypeName", () => {
  const base = { archetypeId: "dragapult", sprites: [] };

  it("型名は括弧で囲む", () => {
    expect(
      similarDeckArchetypeName({
        ...base,
        archetypeName: "ドラパルトex",
        variantName: "バシャーモ型",
        label: "ドラパルトex バシャーモ型",
      }),
    ).toBe("ドラパルトex(バシャーモ型)");
  });

  it("型が無ければ主デッキ名だけ", () => {
    expect(
      similarDeckArchetypeName({
        ...base,
        archetypeName: "ドラパルトex",
        variantName: null,
        label: "ドラパルトex",
      }),
    ).toBe("ドラパルトex");
  });

  it("空白の続く名前は 1 つに詰める", () => {
    expect(
      similarDeckArchetypeName({
        ...base,
        archetypeName: "ばけ  がくれ",
        variantName: " ",
        label: "ばけ  がくれ",
      }),
    ).toBe("ばけ がくれ");
  });

  it("主デッキ名の無い古い応答は label を使い、未分類は null", () => {
    expect(
      similarDeckArchetypeName({
        ...base,
        archetypeName: null,
        variantName: null,
        label: "ドラパルトex バシャーモ型",
      }),
    ).toBe("ドラパルトex バシャーモ型");
    expect(
      similarDeckArchetypeName({
        archetypeId: null,
        archetypeName: null,
        variantName: null,
        label: null,
        sprites: [],
      }),
    ).toBeNull();
  });
});

describe("environmentOnDate", () => {
  const environments = [
    { id: "m6a", from_date: "2026-09-16T00:00:00+09:00" },
    { id: "m5", from_date: "2026-07-18T00:00:00+09:00" },
  ];

  it("開始日がその日以前の環境のうち、いちばん新しいものを返す(並び順によらない)", () => {
    expect(environmentOnDate(environments, "2026-09-15")?.id).toBe("m5");
    expect(environmentOnDate(environments, "2026-09-16")?.id).toBe("m6a");
    // 終了日では区切らない(次の環境が始まるまでは続く)
    expect(environmentOnDate(environments, "2027-03-01")?.id).toBe("m6a");
  });

  it("どの環境よりも前なら null", () => {
    expect(environmentOnDate(environments, "2026-01-01")).toBeNull();
  });
});

describe("similarDecksApiPath", () => {
  it("date を添えると ?date= を付ける", () => {
    expect(similarDecksApiPath("aaaaaa-bbbbbb-cccccc")).toBe("/api/deckcards/aaaaaa-bbbbbb-cccccc/similar");
    expect(similarDecksApiPath("aaaaaa-bbbbbb-cccccc", "2026-09-10")).toBe(
      "/api/deckcards/aaaaaa-bbbbbb-cccccc/similar?date=2026-09-10",
    );
  });
});

describe("isSimilarDecksAvailableOn", () => {
  it("『30th CELEBRATION』の開始日(2026-09-16)から使える", () => {
    expect(isSimilarDecksAvailableOn("2026-09-15")).toBe(false);
    expect(isSimilarDecksAvailableOn("2026-09-16")).toBe(true);
    expect(isSimilarDecksAvailableOn("2027-01-01")).toBe(true);
  });
});
