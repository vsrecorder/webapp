"use client";

import { SeededResource, useSeededResource } from "@app/hooks/useSeededResource";
import { SimilarDecksGetResponseType } from "@app/types/similar_deck";
import { readSimilarDecksBody, similarDecksApiPath } from "@app/utils/similarDecks";

/*
 * 類似している入賞デッキ(バトラボの類似デッキ検索)を BFF から取る。
 *
 * 取れなかった理由を 2 つに分ける。
 *   unavailable … 利用者のコード側の理由(公式サイトに無い・60 枚でない)。押し直しても
 *                 変わらないので、データとして持ち、画面は文言を出す
 *   例外        … BFF やバトラボに届かない。useSeededResource が error にし、画面は再試行を出す
 */
export type SimilarDecksView =
  | { kind: "ok"; data: SimilarDecksGetResponseType }
  | { kind: "unavailable"; message: string };

const UNAVAILABLE_STATUSES = new Set([400, 404, 422]);

async function fetchSimilarDecks(code: string): Promise<SimilarDecksView> {
  const res = await fetch(similarDecksApiPath(code), {
    headers: { Accept: "application/json" },
  });

  if (UNAVAILABLE_STATUSES.has(res.status)) {
    const body: unknown = await res.json().catch(() => null);
    const message =
      body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : "このデッキは比べられません";

    return { kind: "unavailable", message };
  }

  if (!res.ok) throw new Error(`similar decks: HTTP ${res.status}`);

  // BFF が表示用の形に直して返すので、ここでは形を確かめるだけにする(組み替えない)
  const data = readSimilarDecksBody(await res.json());
  if (!data) throw new Error("similar decks: unexpected body");

  return { kind: "ok", data };
}

// code が null のあいだは取りにいかない(シートを開いたときだけ渡す)
export function useSimilarDecks(code: string | null): SeededResource<SimilarDecksView> {
  return useSeededResource(code, fetchSimilarDecks);
}
