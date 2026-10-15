// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TemplateSharedDecks from "@app/components/templates/SharedDecks";
import { DeckCodePostType } from "@app/types/deck_code_post";
import { noteReturnNavigation } from "@app/utils/returnNavigation";
import {
  SHARED_DECKS_RETURN_KEY,
  SharedDecksReturnState,
  markPostListReturn,
} from "@app/utils/sharedDecksReturn";

/*
 * みんなの公開デッキから個別ページ・投稿者ページへ進んで戻ったとき、離れる前の一覧
 * (絞り込み・読み込んだ投稿)をそのまま出し、押したカードの位置へ戻すこと。
 * 戻る以外の経路で開き直したときは、控えを使わずに先頭から出すこと。
 */

// カードは中身を問わないので、詳細・投稿者へのリンクだけを持つ軽いものに差し替える
vi.mock("@app/components/organisms/DeckCodePost/DeckCodePostCard", () => ({
  default: ({ post }: { post: DeckCodePostType }) => (
    <div data-testid="post">
      {post.deck_name}
      <a href={`/shared_decks/${post.id}`}>詳細-{post.id}</a>
      <a href="https://example.com/" target="_blank">外部-{post.id}</a>
    </div>
  ),
}));
// 絞り込みのモーダルやセグメントは開かないので描かない(取得やルーターを持ち込まない)
vi.mock("@app/components/organisms/DeckCodePost/EnvironmentPickerModal", () => ({ default: () => null }));
vi.mock("@app/components/organisms/DeckCodePost/AceSpecFilterModal", () => ({ default: () => null }));
vi.mock("@app/components/organisms/DeckCodePost/LoginPromptModal", () => ({ default: () => null }));
vi.mock("@app/components/organisms/Match/Modal/PokemonSpriteModal", () => ({ default: () => null }));
vi.mock("@app/components/molecules/DeckSegmentedControl", () => ({ default: () => null }));
vi.mock("@app/components/atoms/PokemonSprite", () => ({ default: () => null }));

// jsdom は ResizeObserver を持たない。固定バー(DeckViewToggleBar)が使う
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

function post(id: string): DeckCodePostType {
  return { id, deck_name: `デッキ${id}` } as DeckCodePostType;
}

const INITIAL = {
  limit: 20,
  offset: 0,
  environment: null,
  posts: [post("server-1")],
} as never;

const fetchMock = vi.fn();
const scrollTo = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  window.history.replaceState(null, "", "/shared_decks");
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockReset();
  scrollTo.mockReset();
});

function saveReturn() {
  markPostListReturn<SharedDecksReturnState>(SHARED_DECKS_RETURN_KEY, {
    anchorPostId: "b",
    environment: null,
    sprite1: { id: "0887", name: "ドラパルトex", image_url: "" },
    sprite2: null,
    aceSpec: null,
    posts: [post("a"), post("b")],
    postsEnvironment: null,
    hasMore: false,
  });
}

describe("TemplateSharedDecks の戻り", () => {
  it("戻ってきたときは控えた一覧を出して押したカードへ戻し、控えを消して中身だけ最新にする", async () => {
    // 裏の取り直しの応答。進んだ先でいいねされた b と、その間に増えた新着 z
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        environment: null,
        posts: [post("z"), post("a"), { ...post("b"), deck_name: "デッキb(いいね後)" }],
      }),
    });
    // 控えた「後」に戻る(同じミリ秒だと前後が決まらないので時計を進める)
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-15T10:00:00Z"));
    saveReturn();
    vi.setSystemTime(new Date("2026-10-15T10:00:05Z"));
    noteReturnNavigation();
    vi.useRealTimers();
    // jsdom は寸法を持たない。見えているカードとして扱わせる(位置合わせは見えている方を探す)
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 500,
      width: 100,
    } as DOMRect);

    render(<TemplateSharedDecks viewerId={null} initial={INITIAL} />);
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    });

    // 絞り込み(ポケモン)も離れる前のまま
    expect(screen.getByRole("button", { pressed: true })).toBeTruthy();
    expect(scrollTo).toHaveBeenCalled();
    expect(sessionStorage.getItem(SHARED_DECKS_RETURN_KEY)).toBeNull();

    // 取り直しは読み込み済みの範囲を、離れる前と同じ絞り込みで1回だけ
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("offset=0");
    expect(String(fetchMock.mock.calls[0][0])).toContain("pokemon_sprite_id=0887");

    // 中身は新しくなるが、並び・件数は控えのまま(新着 z は足さない。位置がずれるため)
    await waitFor(() =>
      expect(screen.getAllByTestId("post").map((el) => el.firstChild?.textContent)).toEqual([
        "デッキa",
        "デッキb(いいね後)",
      ]),
    );
  });

  it("戻る以外の経路で開いたときは控えを使わずに先頭から出し、控えは消す", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-15T10:00:00Z"));
    noteReturnNavigation();
    vi.setSystemTime(new Date("2026-10-15T10:00:05Z"));
    saveReturn();
    vi.useRealTimers();

    render(<TemplateSharedDecks viewerId={null} initial={INITIAL} />);

    expect(screen.getAllByTestId("post").map((el) => el.firstChild?.textContent)).toEqual([
      "デッキserver-1",
    ]);
    expect(sessionStorage.getItem(SHARED_DECKS_RETURN_KEY)).toBeNull();
  });

  it("カードからページを離れるリンクを押すと今の一覧を控え、表示中の一覧はそのまま", () => {
    render(<TemplateSharedDecks viewerId={null} initial={INITIAL} />);

    // 別タブで開くリンクでは控えない(一覧は残る)
    fireEvent.click(screen.getByText("外部-server-1"));
    expect(sessionStorage.getItem(SHARED_DECKS_RETURN_KEY)).toBeNull();

    fireEvent.click(screen.getByText("詳細-server-1"));

    const saved = JSON.parse(sessionStorage.getItem(SHARED_DECKS_RETURN_KEY) ?? "null");
    expect(saved).toMatchObject({ anchorPostId: "server-1", posts: [{ id: "server-1" }] });
    expect(screen.getAllByTestId("post")).toHaveLength(1);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("別のページへ戻ったあと(大会結果の戻るリンクなど)に下部ナビで開いたときは戻さない", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-15T10:00:00Z"));
    saveReturn();
    vi.setSystemTime(new Date("2026-10-15T10:00:05Z"));
    noteReturnNavigation("/cityleague_results");
    vi.useRealTimers();

    render(<TemplateSharedDecks viewerId={null} initial={INITIAL} />);

    expect(screen.getAllByTestId("post").map((el) => el.firstChild?.textContent)).toEqual([
      "デッキserver-1",
    ]);
    expect(sessionStorage.getItem(SHARED_DECKS_RETURN_KEY)).toBeNull();
  });

  it("読めない控えは使わずに消す", () => {
    sessionStorage.setItem(SHARED_DECKS_RETURN_KEY, "{broken");

    render(<TemplateSharedDecks viewerId={null} initial={INITIAL} />);

    expect(screen.getAllByTestId("post")).toHaveLength(1);
    expect(sessionStorage.getItem(SHARED_DECKS_RETURN_KEY)).toBeNull();
  });
});
