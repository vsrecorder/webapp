import { cache } from "react";

import {
  DeckCodePostGetByIdResponseType,
  DeckCodePostGetByUserIdResponseType,
  DeckCodePostGetResponseType,
} from "@app/types/deck_code_post";
import { getJson } from "@app/utils/coreApi";
import { UpstreamError, fetchUpstream, upstreamUrl } from "@app/utils/upstream";
import { optionalAuthorizationHeader } from "@app/utils/upstreamToken";

// みんなの公開デッキをサーバ側(ページの描画・generateMetadata・sitemap)から上流へ直接取る。
// ブラウザからは BFF(/api/deck_code_posts 配下)を使う。
//
// ページの描画と generateMetadata が同じ投稿を二度取らないよう、React の cache で
// 同じ引数の呼び出しを1回にまとめる(fetch の重複排除はヘッダまで一致しないと効かないため)。

// 1ページ目・投稿者ページで最初に載せる件数(上流の上限は 50)
export const DECK_CODE_POST_PAGE_SIZE = 20;

// 取得結果。取り下げ済みは上流が 410 を返すので、404 と区別して「公開を終了しました」を出せるようにする。
export type DeckCodePostFetchResult =
  | { status: "ok"; post: DeckCodePostGetByIdResponseType }
  | { status: "gone" }
  | { status: "not_found" };

function headers(viewerId: string | null): HeadersInit {
  return { Accept: "application/json", ...optionalAuthorizationHeader(viewerId) };
}

// 投稿1件。viewerId を渡すと「自分がいいね済みか」が入る。
export const getDeckCodePost = cache(
  async (id: string, viewerId: string | null): Promise<DeckCodePostFetchResult> => {
    try {
      const post = await fetchUpstream<DeckCodePostGetByIdResponseType>(
        upstreamUrl`/api/v1beta/deck_code_posts/${id}`,
        { method: "GET", headers: headers(viewerId) },
      );
      return { status: "ok", post };
    } catch (error) {
      if (error instanceof UpstreamError) {
        if (error.status === 410) return { status: "gone" };
        if (error.status === 404 || error.status === 400) return { status: "not_found" };
      }
      throw error;
    }
  },
);

// 未ログインの1ページ目を Next のデータキャッシュに持たせる秒数。未ログインの応答は誰が見ても
// 同じ内容なので、X からの流入やクロールが集中しても上流への問い合わせはこの間隔に1回で済む。
// いいね数や新着はこの秒数だけ遅れて見えるが、開いた後はクライアントが最新を取る。
const FIRST_PAGE_GUEST_REVALIDATE_SECONDS = 30;

// 一覧の1ページ目(新着・現在の環境・絞り込みなし)。取れなければ null(クライアントが取り直す)。
// ログイン中は「自分がいいね済みか」が入るため人ごとに違い、キャッシュせず都度取る。
export const getDeckCodePostFirstPage = cache(
  async (viewerId: string | null): Promise<DeckCodePostGetResponseType | null> => {
    const params = new URLSearchParams({
      sort: "new",
      limit: String(DECK_CODE_POST_PAGE_SIZE),
      offset: "0",
    });
    const path = `/api/v1beta/deck_code_posts?${params.toString()}`;
    try {
      if (!viewerId) {
        return await getJson<DeckCodePostGetResponseType>(path, FIRST_PAGE_GUEST_REVALIDATE_SECONDS);
      }

      return await fetchUpstream<DeckCodePostGetResponseType>(upstreamUrl`/api/v1beta/deck_code_posts?${params}`, {
        method: "GET",
        headers: headers(viewerId),
      });
    } catch (error) {
      console.error("failed to fetch deck code posts for the first page", error);
      return null;
    }
  },
);

// 投稿者ページの1ページ目(投稿者の公開情報と集計を含む)。ユーザが無ければ null。
export const getDeckCodePostsByUser = cache(
  async (
    userId: string,
    viewerId: string | null,
  ): Promise<DeckCodePostGetByUserIdResponseType | null> => {
    const params = new URLSearchParams({ limit: String(DECK_CODE_POST_PAGE_SIZE), offset: "0" });
    try {
      return await fetchUpstream<DeckCodePostGetByUserIdResponseType>(
        upstreamUrl`/api/v1beta/users/${userId}/deck_code_posts?${params}`,
        { method: "GET", headers: headers(viewerId) },
      );
    } catch (error) {
      if (error instanceof UpstreamError && (error.status === 404 || error.status === 400)) {
        return null;
      }
      throw error;
    }
  },
);

// sitemap の取得を Next のデータキャッシュに持たせる秒数。クローラが sitemap を何度読んでも
// 上流への問い合わせはこの間隔に1回で済む。
const SITEMAP_REVALIDATE_SECONDS = 300;

// sitemap に載せる直近の投稿(現在の環境の新着)。id と公開日時だけを返す。
// 上流の1回の上限(50件)で数ページぶん取り、失敗したら取れたところまでを返す。
export async function getRecentDeckCodePostRefs(
  max: number,
): Promise<{ id: string; publishedAt: string }[]> {
  const pageSize = 50;
  const refs: { id: string; publishedAt: string }[] = [];

  for (let offset = 0; offset < max; offset += pageSize) {
    const params = new URLSearchParams({
      sort: "new",
      limit: String(Math.min(pageSize, max - offset)),
      offset: String(offset),
    });
    const data = await getJson<DeckCodePostGetResponseType>(
      `/api/v1beta/deck_code_posts?${params.toString()}`,
      SITEMAP_REVALIDATE_SECONDS,
    );
    if (!data) break;

    for (const post of data.posts) {
      refs.push({ id: post.id, publishedAt: post.published_at });
    }
    if (data.posts.length < pageSize) break;
  }

  return refs;
}
