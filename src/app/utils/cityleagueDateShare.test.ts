import { describe, expect, it } from "vitest";

import { DeckArchetypeType } from "@app/types/deck_archetype";
import {
  cityleagueDatePath,
  cityleagueDatePostText,
  cityleagueDateXIntentUrl,
  summarizeDateWinners,
} from "@app/utils/cityleagueDateShare";

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

describe("開催日ページのシェア", () => {
  it("ページの URL", () => {
    expect(cityleagueDatePath("2026-09-26")).toBe("/cityleague_results/dates/2026-09-26");
  });

  it("ポスト文はページ名とハッシュタグ", () => {
    expect(cityleagueDatePostText("2026年9月26日(土)")).toBe(
      "2026年9月26日(土)のシティリーグ入賞デッキ一覧\n#バトレコ #ポケカ",
    );
  });

  it("X の intent に文言と utm 付きの URL を渡す", () => {
    const intent = new URL(
      cityleagueDateXIntentUrl("2026-09-26", "2026年9月26日(土)", "https://vsrecorder.mobi"),
    );
    expect(intent.origin + intent.pathname).toBe("https://x.com/intent/post");
    expect(intent.searchParams.get("text")).toBe(cityleagueDatePostText("2026年9月26日(土)"));

    const url = new URL(intent.searchParams.get("url")!);
    expect(url.origin + url.pathname).toBe(
      "https://vsrecorder.mobi/cityleague_results/dates/2026-09-26",
    );
    expect(url.searchParams.get("utm_source")).toBe("x");
    expect(url.searchParams.get("utm_medium")).toBe("share");
    expect(url.searchParams.get("utm_campaign")).toBe("cityleague_date");
  });
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
