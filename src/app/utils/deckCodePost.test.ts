import { afterEach, describe, expect, it, vi } from "vitest";

import { DeckCodePostType } from "@app/types/deck_code_post";
import {
  DeckCodePostApiError,
  deckCodePostPath,
  deckCodePostShareUrl,
  deckCodePostUserPath,
  formatPublishedDate,
  formatRelativeTime,
  officialDeckUrl,
  sharedDecksPath,
  swrFetcher,
} from "@app/utils/deckCodePost";

describe("formatRelativeTime", () => {
  const now = new Date("2026-09-05T12:00:00+09:00");

  it("1分未満は「たった今」、1時間未満は分、1日未満は時間、7日未満は日で表す", () => {
    expect(formatRelativeTime("2026-09-05T11:59:30+09:00", now)).toBe("たった今");
    expect(formatRelativeTime("2026-09-05T11:15:00+09:00", now)).toBe("45分前");
    expect(formatRelativeTime("2026-09-05T03:00:00+09:00", now)).toBe("9時間前");
    expect(formatRelativeTime("2026-09-02T12:00:00+09:00", now)).toBe("3日前");
  });

  it("7日以上前は日付、年が違えば年も付ける", () => {
    expect(formatRelativeTime("2026-08-20T12:00:00+09:00", now)).toBe("8月20日");
    expect(formatRelativeTime("2025-12-31T12:00:00+09:00", now)).toBe("2025年12月31日");
  });
});

describe("formatPublishedDate", () => {
  it("ISO 文字列の日付部分をスラッシュ区切りにする(時計・タイムゾーンに依らない)", () => {
    expect(formatPublishedDate("2026-09-04T21:26:38+09:00")).toBe("2026/09/04");
    expect(formatPublishedDate("2026-09-04T23:59:59Z")).toBe("2026/09/04");
  });
});

describe("paths", () => {
  it("みんなの公開デッキの URL は /shared_decks 配下", () => {
    expect(sharedDecksPath).toBe("/shared_decks");
    expect(deckCodePostPath("01M1P6585WZKD7W2EWXYRXFETH")).toBe(
      "/shared_decks/01M1P6585WZKD7W2EWXYRXFETH",
    );
    expect(deckCodePostUserPath("uid")).toBe("/shared_decks/users/uid");
    expect(officialDeckUrl("pypypM-MqpNAJ-UyXRpR")).toBe(
      "https://www.pokemon-card.com/deck/deck.html?deckID=pypypM-MqpNAJ-UyXRpR",
    );
  });
});

describe("deckCodePostShareUrl", () => {
  it("X の投稿画面へ、utm 付きの個別ページ URL とデッキ名を渡す", () => {
    const post = {
      id: "01M1P6585WZKD7W2EWXYRXFETH",
      deck_name: "オーロンゲ",
    } as DeckCodePostType;
    const share = new URL(deckCodePostShareUrl(post, "https://vsrecorder.mobi"));

    expect(share.origin + share.pathname).toBe("https://x.com/intent/post");
    expect(share.searchParams.get("text")).toBe(
      "『オーロンゲ』 をバトレコで公開しました\n#バトレコ",
    );

    const url = new URL(share.searchParams.get("url") ?? "");
    expect(url.origin + url.pathname).toBe(
      "https://vsrecorder.mobi/shared_decks/01M1P6585WZKD7W2EWXYRXFETH",
    );
    expect(url.searchParams.get("utm_source")).toBe("x");
    expect(url.searchParams.get("utm_medium")).toBe("share");
    expect(url.searchParams.get("utm_campaign")).toBe("deck_code_post");
  });
});

describe("swrFetcher", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("200 なら JSON を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );

    await expect(swrFetcher<{ ok: boolean }>("/api/x")).resolves.toEqual({ ok: true });
  });

  it("204(本文なし)は null を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    );

    await expect(swrFetcher<unknown>("/api/x")).resolves.toBeNull();
  });

  it("失敗はステータス付きの DeckCodePostApiError にする", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 429 })),
    );

    const error = await swrFetcher("/api/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DeckCodePostApiError);
    expect((error as DeckCodePostApiError).status).toBe(429);
  });
});
