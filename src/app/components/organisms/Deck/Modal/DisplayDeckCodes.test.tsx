// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";

import DisplayDeckCodesModal from "@app/components/organisms/Deck/Modal/DisplayDeckCodes";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";

// 一覧の中の部品(デッキの絵・戦績など)がログイン中の利用者を引く
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "u1" } }, status: "authenticated" }),
}));

// jsdom は ResizeObserver / IntersectionObserver を持たない
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
} as unknown as typeof IntersectionObserver;

afterEach(cleanup);

const json = { "content-type": "application/json" };

const version = {
  id: "01KZNTTDTF88D814T7GQHGYNC1",
  created_at: "2026-11-01T10:00:00+09:00",
  deck_id: "01KZNTTDTF88D814T7GQHGYNTX",
  code: "gnLgHn-ZzZzZz-QQLLgg",
  private_code_flg: true,
  memo: "元のメモ",
  tags: [],
  pokemon_sprites: [],
} as unknown as DeckCodeType;

const deck = {
  id: version.deck_id,
  name: "テストデッキ",
  user_id: "u1",
  private_flg: true,
  pokemon_sprites: [],
  tags: [],
  latest_deck_code: version,
} as unknown as DeckGetByIdResponseType;

/*
 * PUT /api/deckcodes/{id} だけ指定の応答を返す。
 * バージョン一覧(/api/decks/{id}/deckcodes)は1件、版ごとの戦績は対戦なし、ほか(アイコン・タグの一覧など)は空で返す。
 */
const stubVersionPut = (respond: () => Response) => {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (u === `/api/deckcodes/${version.id}` && init?.method === "PUT") return respond();
    if (u.startsWith(`/api/decks/${deck.id}/deckcodes`)) {
      return new Response(JSON.stringify([version]), { headers: json });
    }
    // 版ごとの戦績。まだ対戦が無い状態で返す
    if (u.includes("/deck-code-usage")) {
      return new Response(JSON.stringify({ deck_codes: [] }), { headers: json });
    }

    return new Response("[]", { headers: json });
  });
  vi.stubGlobal("fetch", fetchMock);

  return () =>
    fetchMock.mock.calls.filter(
      ([url, init]) => String(url) === `/api/deckcodes/${version.id}` && init?.method === "PUT",
    ).length;
};

const saveButton = () => screen.getByRole("button", { name: "保存" });
const memoInput = () => screen.getByLabelText("メモ") as HTMLTextAreaElement;

const renderOpen = (setDeckCode: () => void) =>
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <DisplayDeckCodesModal
        deck={deck}
        deckcode={version}
        setDeckCode={setDeckCode}
        isOpen
        onOpenChange={() => {}}
        onClose={() => {}}
      />
    </SWRConfig>,
  );

// バージョンの一覧が出たら、そのバージョンの編集(メモ・タグ・アイコン)を開く
const openEdit = async () => {
  fireEvent.click(await screen.findByRole("button", { name: "このバージョンのアイコンを変更する" }));
  await screen.findByText("バージョンを編集");
};

/*
 * バージョンの編集(メモ・タグ・アイコン)の保存に失敗しても入力を消さない。
 * 以前は失敗時にも編集モーダルを閉じる処理を呼んでおり、その後始末が入力を空に戻していた。
 */
describe("DisplayDeckCodesModal のバージョン編集", () => {
  it("保存に失敗しても閉じず、入力したメモが残り、そのまま再送できる", async () => {
    const putCount = stubVersionPut(
      () => new Response(JSON.stringify({ message: "bad request" }), { status: 400, headers: json }),
    );
    const setDeckCode = vi.fn();
    renderOpen(setDeckCode);
    await openEdit();

    expect(memoInput().value).toBe("元のメモ");
    fireEvent.change(memoInput(), { target: { value: "サイドを1枚入れ替えた" } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(putCount()).toBe(1));
    // 保存中は押せない。失敗の後始末が済むと、また押せる
    await waitFor(() => expect(saveButton().hasAttribute("disabled")).toBe(false));

    // 編集モーダルは開いたままで、入力もそのまま
    expect(screen.getByText("バージョンを編集")).toBeTruthy();
    expect(memoInput().value).toBe("サイドを1枚入れ替えた");
    expect(setDeckCode).not.toHaveBeenCalled();

    fireEvent.click(saveButton());
    await waitFor(() => expect(putCount()).toBe(2));
  });

  it("保存に成功したら反映して編集モーダルを閉じる", async () => {
    const putCount = stubVersionPut(
      () =>
        new Response(JSON.stringify({ ...version, memo: "サイドを1枚入れ替えた" }), {
          headers: json,
        }),
    );
    const setDeckCode = vi.fn();
    renderOpen(setDeckCode);
    await openEdit();

    fireEvent.change(memoInput(), { target: { value: "サイドを1枚入れ替えた" } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(setDeckCode).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText("バージョンを編集")).toBeNull());
    expect(putCount()).toBe(1);
  });
});

/*
 * デッキのタグと最新バージョンのタグは常に揃える(サーバが揃える。usecase/deck_tag_sync.go)。
 * 最新バージョンのタグを編集したら、手元のデッキのタグもそれに揃え、デッキ情報モーダル・一覧カードに出す。
 */
describe("DisplayDeckCodesModal のタグの同期", () => {
  const newTag = { id: "01KZNTTDTF88D814T7GQHGTAG2", name: "新しいACE SPEC", color: "", text_color: "", preset_flg: false };

  it("最新バージョンを保存したら、デッキのタグをそのバージョンのタグにする", async () => {
    stubVersionPut(() => new Response(JSON.stringify({ ...version, tags: [newTag] }), { headers: json }));
    const setDeck = vi.fn();
    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <DisplayDeckCodesModal
          deck={deck}
          setDeck={setDeck}
          deckcode={version}
          setDeckCode={() => {}}
          isOpen
          onOpenChange={() => {}}
          onClose={() => {}}
        />
      </SWRConfig>,
    );
    await openEdit();

    fireEvent.click(saveButton());

    await waitFor(() => expect(setDeck).toHaveBeenCalled());
    const update = setDeck.mock.calls.at(-1)![0] as (
      prev: DeckGetByIdResponseType,
    ) => DeckGetByIdResponseType;
    const next = update(deck);
    expect(next.tags).toEqual([newTag]);
    expect(next.latest_deck_code.tags).toEqual([newTag]);
  });
});
