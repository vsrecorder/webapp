// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TemplateSharedDecksByUser from "@app/components/templates/SharedDecksByUser";
import { DeckCodePostGetByUserIdResponseType, DeckCodePostType } from "@app/types/deck_code_post";
import { noteReturnNavigation } from "@app/utils/returnNavigation";
import {
  SHARED_DECKS_USER_RETURN_KEY,
  SharedDecksUserReturnState,
  markPostListReturn,
} from "@app/utils/sharedDecksReturn";

/*
 * 投稿者ページから個別ページ・別の投稿者ページへ進んで戻ったとき、離れる前に読み込んであった
 * 投稿をそのまま出し、押したカードの位置へ戻すこと。控えは同じ投稿者のページでだけ使う。
 */

vi.mock("@app/components/organisms/DeckCodePost/DeckCodePostCard", () => ({
  default: ({ post }: { post: DeckCodePostType }) => (
    <div data-testid="post">
      {post.deck_name}
      <a href={`/shared_decks/${post.id}`}>詳細-{post.id}</a>
      <a href={`/shared_decks/users/${post.user.id}`}>投稿者-{post.id}</a>
    </div>
  ),
}));
vi.mock("@app/components/organisms/DeckCodePost/LoginPromptModal", () => ({ default: () => null }));
vi.mock("@app/components/molecules/BackLink", () => ({ default: () => null }));

function post(id: string, userId = "u1"): DeckCodePostType {
  return { id, deck_name: `デッキ${id}`, user: { id: userId } } as DeckCodePostType;
}

const INITIAL = {
  user: { id: "u1", name: "投稿者", image_url: "", designation_tier: 0 },
  post_count: 3,
  like_count_total: 0,
  posts: [post("server-1")],
} as unknown as DeckCodePostGetByUserIdResponseType;

const fetchMock = vi.fn();
const scrollTo = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  window.history.replaceState(null, "", "/shared_decks/users/u1");
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockReset();
  scrollTo.mockReset();
});

// userId の投稿者ページの控えを置いてから、戻ってきたことにする
function saveReturnThenTraverse(userId: string) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-15T10:00:00Z"));
  markPostListReturn<SharedDecksUserReturnState>(SHARED_DECKS_USER_RETURN_KEY, {
    anchorPostId: "b",
    userId,
    posts: [post("a"), post("b"), post("c")],
    hasMore: false,
  });
  vi.setSystemTime(new Date("2026-10-15T10:00:05Z"));
  noteReturnNavigation();
  vi.useRealTimers();
}

const shownPosts = () => screen.getAllByTestId("post").map((el) => el.firstChild?.textContent);

describe("TemplateSharedDecksByUser の戻り", () => {
  it("同じ投稿者のページへ戻ったら、控えた投稿を出してカードへ戻す", async () => {
    // 裏の取り直し(中身を最新に寄せるだけ)の応答
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...INITIAL, posts: [post("a"), post("b"), post("c")] }),
    });
    saveReturnThenTraverse("u1");
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 500,
      width: 100,
    } as DOMRect);

    render(<TemplateSharedDecksByUser userId="u1" viewerId={null} initial={INITIAL} />);
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    });

    expect(shownPosts()).toEqual(["デッキa", "デッキb", "デッキc"]);
    // 取り直しは読み込み済みの範囲(3件なので1ページ)を1回だけ
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/users/u1/deck_code_posts?limit=20&offset=0");
    expect(scrollTo).toHaveBeenCalled();
    expect(sessionStorage.getItem(SHARED_DECKS_USER_RETURN_KEY)).toBeNull();
  });

  it("別の投稿者のページでは控えを使わず、消しもしない(その投稿者のページへ戻るときに使う)", () => {
    saveReturnThenTraverse("u2");

    render(<TemplateSharedDecksByUser userId="u1" viewerId={null} initial={INITIAL} />);

    expect(shownPosts()).toEqual(["デッキserver-1"]);
    expect(sessionStorage.getItem(SHARED_DECKS_USER_RETURN_KEY)).not.toBeNull();
  });

  it("カードの詳細へのリンクでは控え、今いる投稿者ページへのリンクでは控えない", () => {
    render(<TemplateSharedDecksByUser userId="u1" viewerId={null} initial={INITIAL} />);

    fireEvent.click(screen.getByText("投稿者-server-1"));
    expect(sessionStorage.getItem(SHARED_DECKS_USER_RETURN_KEY)).toBeNull();

    fireEvent.click(screen.getByText("詳細-server-1"));
    const saved = JSON.parse(sessionStorage.getItem(SHARED_DECKS_USER_RETURN_KEY) ?? "null");
    expect(saved).toMatchObject({ anchorPostId: "server-1", userId: "u1" });
  });
});
