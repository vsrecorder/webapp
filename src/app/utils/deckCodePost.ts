import {
  DeckCodePostCreateResponseType,
  DeckCodePostGetLikersResponseType,
  DeckCodePostLikeResponseType,
  DeckCodePostType,
} from "@app/types/deck_code_post";

// みんなの公開デッキ関連の BFF 呼び出しと、表示用の小さなヘルパー。

export class DeckCodePostApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "DeckCodePostApiError";
    this.status = status;
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new DeckCodePostApiError(res.status, `request failed: ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

// SWR 用の GET。失敗は DeckCodePostApiError、204(本文なし)は null を返す。
// みんなの公開デッキ関連のフックとモーダルで同じ取り方をするために1か所に置く。
export async function swrFetcher<T>(url: string): Promise<T> {
  const data = await requestJson<T | undefined>(url, { method: "GET" });
  return (data === undefined ? null : data) as T;
}

// 公開(投稿の作成)。既に公開中なら上流がその投稿を返す(冪等)。
export async function publishDeckCode(deckCodeId: string): Promise<DeckCodePostType> {
  return requestJson<DeckCodePostCreateResponseType>("/api/deck_code_posts", {
    method: "POST",
    body: JSON.stringify({ deck_code_id: deckCodeId }),
  });
}

export async function unpublishDeckCodePost(postId: string): Promise<void> {
  await requestJson<void>(`/api/deck_code_posts/${postId}`, { method: "DELETE" });
}

export async function likeDeckCodePost(postId: string): Promise<DeckCodePostType> {
  return requestJson<DeckCodePostLikeResponseType>(
    `/api/deck_code_posts/${postId}/like`,
    {
      method: "PUT",
    },
  );
}

export async function unlikeDeckCodePost(postId: string): Promise<DeckCodePostType> {
  return requestJson<DeckCodePostLikeResponseType>(
    `/api/deck_code_posts/${postId}/like`,
    {
      method: "DELETE",
    },
  );
}

export async function fetchDeckCodePostLikers(
  postId: string,
  limit: number,
  offset: number,
): Promise<DeckCodePostGetLikersResponseType> {
  return requestJson<DeckCodePostGetLikersResponseType>(
    `/api/deck_code_posts/${postId}/likes?limit=${limit}&offset=${offset}`,
  );
}

// 公開した時刻の相対表記。タイムラインの投稿カードで使う。
// 公開日を "2026/09/04" の形で返す。ISO 文字列の日付部分をそのまま使うので、
// サーバとクライアントの時計・タイムゾーンが違っても同じ文字になる(ハイドレーション前の表示用)。
export function formatPublishedDate(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, "/");
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;

  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

// 個別ページの URL(シェア用)。
// みんなの公開デッキの一覧。/decks の外に置き、ログイン必須のガードや robots の除外を受けないようにする
export const sharedDecksPath = "/shared_decks";

export function deckCodePostPath(postId: string): string {
  return `/shared_decks/${postId}`;
}

export function deckCodePostUserPath(userId: string): string {
  return `/shared_decks/users/${userId}`;
}

// 公式サイトのデッキページ。シティリーグ結果の入賞デッキと同じ形式で開く。
export function officialDeckUrl(code: string): string {
  return `https://www.pokemon-card.com/deck/deck.html?deckID=${code}`;
}

// X へのシェア。既存のX投稿と同じく utm を付け、登録転換を追えるようにする。
export function deckCodePostShareUrl(post: DeckCodePostType, origin: string): string {
  const url = new URL(deckCodePostPath(post.id), origin);
  url.searchParams.set("utm_source", "x");
  url.searchParams.set("utm_medium", "share");
  url.searchParams.set("utm_campaign", "deck_code_post");

  const intent = new URL("https://x.com/intent/post");
  intent.searchParams.set(
    "text",
    `${post.deck_name} をバトレコで公開しました\n#バトレコ`,
  );
  intent.searchParams.set("url", url.toString());

  return intent.toString();
}
