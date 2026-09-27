import { DeckArchetypeMap, DeckArchetypesGetResponseType } from "@app/types/deck_archetype";
import { chunkDeckCodes, normalizeDeckCodes } from "@app/utils/deckArchetype";

/*
 * 入賞デッキの種類(バトラボのデッキ分類)を、ブラウザ側から BFF 経由でまとめて引く。
 *
 * シティリーグ結果一覧の 2 ページ目以降(CityleagueResults)と、ホームの「本日のシティリーグ」の
 * 会場カードから開く結果モーダル(CityleagueEvent)が、1 日ぶんのデッキコードで使う。
 *
 * BFF の上限(100 件 = vslab の 1 回の照会)ごとに分けて並列に投げ、1 つの辞書にまとめる。
 * 取れなかった塊は落とす(そのカードに種類の行が出ないだけで、結果は出す)。
 */
export async function fetchDeckArchetypes(codes: string[]): Promise<DeckArchetypeMap> {
  const chunks = chunkDeckCodes(normalizeDeckCodes(codes));

  const maps = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const res = await fetch(
          `/api/cityleague_results/deck_archetypes?codes=${encodeURIComponent(chunk.join(","))}`,
          {
            cache: "no-store",
            method: "GET",
            headers: { Accept: "application/json" },
          },
        );
        if (!res.ok) return {};

        const data: DeckArchetypesGetResponseType = await res.json();

        return data?.decks && typeof data.decks === "object" ? data.decks : {};
      } catch {
        return {};
      }
    }),
  );

  return Object.assign({}, ...maps);
}
