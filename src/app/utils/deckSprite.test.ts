import { describe, expect, it } from "vitest";

import {
  applyLatestVersionSprites,
  deckSelectionSprites,
  hasVersionSprites,
  resolveVersionSprites,
  sameSprites,
} from "@app/utils/deckSprite";

const deckSprites = [
  { id: "0887", position: 1 },
  { id: "0477", position: 2 },
];

describe("resolveVersionSprites", () => {
  it("バージョンに設定があればバージョンのスプライトを使う", () => {
    const versionSprites = [
      { id: "0887", position: 1 },
      { id: "0006", position: 2 },
    ];

    expect(resolveVersionSprites(deckSprites, versionSprites)).toEqual(versionSprites);
  });

  it("バージョンが未設定(空配列)ならデッキのスプライトへフォールバックする", () => {
    expect(resolveVersionSprites(deckSprites, [])).toEqual(deckSprites);
  });

  it("バージョンの項目が無い(古い応答・取得前)ときもデッキのスプライトを使う", () => {
    expect(resolveVersionSprites(deckSprites, undefined)).toEqual(deckSprites);
    expect(resolveVersionSprites(deckSprites, null)).toEqual(deckSprites);
  });

  it("バージョンで片方の枠だけ設定したとき、空き枠にデッキのスプライトを混ぜない", () => {
    const versionSprites = [{ id: "0006", position: 2 }];

    expect(resolveVersionSprites(deckSprites, versionSprites)).toEqual(versionSprites);
  });

  it("どちらも無ければ空配列を返す", () => {
    expect(resolveVersionSprites(undefined, undefined)).toEqual([]);
    expect(resolveVersionSprites(null, [])).toEqual([]);
  });
});

describe("hasVersionSprites", () => {
  it("1体でも設定があれば true", () => {
    expect(hasVersionSprites([{ id: "0006", position: 2 }])).toBe(true);
  });

  it("空・項目なしは false", () => {
    expect(hasVersionSprites([])).toBe(false);
    expect(hasVersionSprites(undefined)).toBe(false);
    expect(hasVersionSprites(null)).toBe(false);
  });
});

describe("sameSprites", () => {
  it("同じ枠に同じスプライトなら同じ(並び順は問わない)", () => {
    expect(sameSprites(deckSprites, [...deckSprites].reverse())).toBe(true);
    expect(sameSprites([], null)).toBe(true);
  });

  it("枠が違えば別物", () => {
    expect(sameSprites([{ id: "0887", position: 1 }], [{ id: "0887", position: 2 }])).toBe(false);
    expect(sameSprites(deckSprites, [deckSprites[0]])).toBe(false);
  });

  it("枠が無い古い形は配列順として比べる", () => {
    expect(sameSprites([{ id: "0887" }, { id: "0477" }], deckSprites)).toBe(true);
  });
});

describe("applyLatestVersionSprites", () => {
  const charizard = [
    { id: "0887", position: 1 },
    { id: "0006", position: 2 },
  ];
  const versions = [
    { id: "v3", pokemon_sprites: charizard },
    { id: "v2", pokemon_sprites: [] },
    { id: "v1", pokemon_sprites: [{ id: "0025", position: 1 }] },
  ];

  it("デッキを最新バージョンのスプライトへ置き換え、未設定のバージョンには元のデッキのものを書き残す", () => {
    const applied = applyLatestVersionSprites(deckSprites, versions, "v3", charizard);

    expect(applied?.deckSprites).toEqual(charizard);
    expect(applied?.versions).toEqual([
      { id: "v3", pokemon_sprites: charizard },
      { id: "v2", pokemon_sprites: deckSprites },
      // 設定済みのバージョンには触れない
      { id: "v1", pokemon_sprites: [{ id: "0025", position: 1 }] },
    ]);
  });

  it("最新バージョン自身が未設定のまま一覧にあっても、元のデッキのもので埋めない", () => {
    const applied = applyLatestVersionSprites(
      deckSprites,
      [{ id: "v3", pokemon_sprites: [] }],
      "v3",
      charizard,
    );

    expect(applied?.versions).toEqual([{ id: "v3", pokemon_sprites: [] }]);
  });

  it("最新バージョンが未設定、またはデッキと同じなら何も変えない", () => {
    expect(applyLatestVersionSprites(deckSprites, versions, "v3", [])).toBeNull();
    expect(applyLatestVersionSprites(deckSprites, versions, "v3", undefined)).toBeNull();
    expect(applyLatestVersionSprites(charizard, versions, "v3", charizard)).toBeNull();
  });

  it("デッキにスプライトが無かったときは、未設定のバージョンへ書き残さない", () => {
    const applied = applyLatestVersionSprites([], versions, "v3", charizard);

    expect(applied?.deckSprites).toEqual(charizard);
    expect(applied?.versions).toBe(versions);
  });
});

describe("deckSelectionSprites", () => {
  const deck = { id: "d1", pokemon_sprites: deckSprites };
  const charizard = [
    { id: "0887", position: 1 },
    { id: "0006", position: 2 },
  ];

  it("バージョンを選んでいれば、そのバージョンのスプライトを返す", () => {
    expect(deckSelectionSprites(deck, { deck_id: "d1", pokemon_sprites: charizard })).toEqual(
      charizard,
    );
  });

  it("未設定のバージョン・バージョン未選択ならデッキのスプライトを返す", () => {
    expect(deckSelectionSprites(deck, { deck_id: "d1", pokemon_sprites: [] })).toEqual(deckSprites);
    expect(deckSelectionSprites(deck, { deck_id: "d1" })).toEqual(deckSprites);
    expect(deckSelectionSprites(deck, null)).toEqual(deckSprites);
  });

  it("別のデッキのバージョンが残っているあいだは、選んだデッキのスプライトを返す", () => {
    // デッキを切り替えた直後は、前のデッキのバージョンがまだ選択に残っている
    expect(deckSelectionSprites(deck, { deck_id: "d2", pokemon_sprites: charizard })).toEqual(
      deckSprites,
    );
  });

  it("デッキを選んでいなければ空を返す", () => {
    expect(deckSelectionSprites(null, { deck_id: "d1", pokemon_sprites: charizard })).toEqual([]);
  });
});
