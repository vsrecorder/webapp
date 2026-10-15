// @vitest-environment jsdom
import { MouseEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { hasReturnedHereSince, noteReturnNavigation } from "@app/utils/returnNavigation";
import {
  SHARED_DECKS_RETURN_KEY,
  SHARED_DECKS_USER_RETURN_KEY,
  SharedDecksReturnState,
  SharedDecksUserReturnState,
  clearPostListReturn,
  isLeavingLinkClick,
  markPostListReturn,
  parsePostListReturn,
  sharedDeckPostAnchorId,
} from "@app/utils/sharedDecksReturn";
import { DeckCodePostType } from "@app/types/deck_code_post";

const STATE = {
  anchorPostId: "p2",
  environment: null,
  sprite1: { id: "s1", name: "ドラパルトex", image_url: "" },
  sprite2: null,
  aceSpec: null,
  posts: [{ id: "p1" }, { id: "p2" }] as DeckCodePostType[],
  postsEnvironment: null,
  hasMore: true,
};

afterEach(() => {
  document.body.innerHTML = "";
  sessionStorage.clear();
  vi.useRealTimers();
});

describe("markPostListReturn / parsePostListReturn", () => {
  it("一覧の中身と押したカードの高さを控え、読み戻せる", () => {
    const card = document.createElement("div");
    card.id = sharedDeckPostAnchorId(SHARED_DECKS_RETURN_KEY, "p2");
    card.getBoundingClientRect = () => ({ top: 420, width: 100 }) as DOMRect;
    document.body.appendChild(card);

    markPostListReturn<SharedDecksReturnState>(SHARED_DECKS_RETURN_KEY, STATE);

    const restored = parsePostListReturn(sessionStorage.getItem(SHARED_DECKS_RETURN_KEY));
    expect(restored).toMatchObject(STATE);
    expect(typeof restored?.savedAt).toBe("number");
    expect(
      sessionStorage.getItem(`returnAnchorTop:${sharedDeckPostAnchorId(SHARED_DECKS_RETURN_KEY, "p2")}`),
    ).toBe("420");
  });

  it("消したあとは何も戻さない", () => {
    markPostListReturn<SharedDecksReturnState>(SHARED_DECKS_RETURN_KEY, STATE);
    clearPostListReturn(SHARED_DECKS_RETURN_KEY);

    expect(parsePostListReturn(sessionStorage.getItem(SHARED_DECKS_RETURN_KEY))).toBeNull();
  });

  it("壊れた値・形の違う値は null にする(先頭から出す)", () => {
    expect(parsePostListReturn(null)).toBeNull();
    expect(parsePostListReturn("{")).toBeNull();
    expect(parsePostListReturn(JSON.stringify({ anchorPostId: "p1" }))).toBeNull();
    expect(
      parsePostListReturn(JSON.stringify({ anchorPostId: "p1", posts: [], savedAt: "x" })),
    ).toBeNull();
  });
});

describe("一覧ごとの目印", () => {
  /*
   * 同じ投稿を一覧と投稿者ページの両方から開いても、一覧で覚えた高さが投稿者ページの高さで
   * 上書きされないこと(上書きされると、一覧へ戻ったときに位置がずれる)。
   */
  it("一覧と投稿者ページで同じ投稿を開いても、それぞれの高さを覚えている", () => {
    const place = (key: string, top: number) => {
      const el = document.createElement("div");
      el.id = sharedDeckPostAnchorId(key, "p1");
      el.getBoundingClientRect = () => ({ top, width: 100 }) as DOMRect;
      document.body.appendChild(el);
      return el;
    };

    place(SHARED_DECKS_RETURN_KEY, 200);
    markPostListReturn<SharedDecksReturnState>(SHARED_DECKS_RETURN_KEY, { ...STATE, anchorPostId: "p1" });
    document.body.innerHTML = "";

    place(SHARED_DECKS_USER_RETURN_KEY, 640);
    markPostListReturn<SharedDecksUserReturnState>(SHARED_DECKS_USER_RETURN_KEY, {
      anchorPostId: "p1",
      userId: "u1",
      posts: [],
      hasMore: false,
    });

    const top = (key: string) =>
      sessionStorage.getItem(`returnAnchorTop:${sharedDeckPostAnchorId(key, "p1")}`);
    expect(top(SHARED_DECKS_RETURN_KEY)).toBe("200");
    expect(top(SHARED_DECKS_USER_RETURN_KEY)).toBe("640");
  });
});

describe("hasReturnedHereSince", () => {
  /*
   * 控えを置いたまま、下部ナビなど「戻る」以外の経路で一覧を開き直したときは戻さない。
   * 控えた後に、このページへ戻ってきた(戻る/進む・戻るリンク)ときだけ真になる。
   */
  it("控えた後にこのページへ戻ってきたときだけ真", () => {
    window.history.replaceState(null, "", "/shared_decks");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-15T10:00:00Z"));
    noteReturnNavigation();

    vi.setSystemTime(new Date("2026-10-15T10:00:05Z"));
    const savedAt = Date.now();
    expect(hasReturnedHereSince(savedAt)).toBe(false);

    // 別のページへの戻り(大会結果の戻るリンクなど)は、このページへの戻りではない
    vi.setSystemTime(new Date("2026-10-15T10:00:10Z"));
    noteReturnNavigation("/cityleague_results");
    expect(hasReturnedHereSince(savedAt)).toBe(false);

    vi.setSystemTime(new Date("2026-10-15T10:00:15Z"));
    noteReturnNavigation("/shared_decks");
    expect(hasReturnedHereSince(savedAt)).toBe(true);
  });
});

describe("isLeavingLinkClick", () => {
  function clickOn(href: string, init: Partial<MouseEvent> = {}, target = "") {
    const a = document.createElement("a");
    a.setAttribute("href", href);
    if (target) a.target = target;
    const span = document.createElement("span");
    a.appendChild(span);
    document.body.appendChild(a);
    return isLeavingLinkClick({ button: 0, target: span, ...init } as unknown as MouseEvent);
  }

  it("同じタブで別のページへ進むリンクだけを離れるとみなす", () => {
    window.history.replaceState(null, "", "/shared_decks/users/u1");

    expect(clickOn("/shared_decks/p1")).toBe(true);
    expect(clickOn("/shared_decks/users/u2")).toBe(true);
    // 今いるページ(投稿者ページのカードの投稿者名)は一覧が残る
    expect(clickOn("/shared_decks/users/u1")).toBe(false);
    // 別タブ・新しいタブ・外部
    expect(clickOn("/shared_decks/p1", {}, "_blank")).toBe(false);
    expect(clickOn("/shared_decks/p1", { metaKey: true })).toBe(false);
    expect(clickOn("https://example.com/")).toBe(false);
    expect(clickOn("//example.com/")).toBe(false);
  });
});
