// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";

import CreateDeckCodeModal from "@app/components/organisms/Deck/Modal/CreateDeckCodeModal";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";
import { TagType } from "@app/types/tag";

// jsdom は ResizeObserver を持たない。タグの候補行(HScrollRow)が溢れ判定に使う
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

afterEach(cleanup);

const json = { "content-type": "application/json" };

const deck = {
  id: "01KZNTTDTF88D814T7GQHGYNTX",
  name: "テストデッキ",
  user_id: "u1",
  private_flg: true,
  pokemon_sprites: [],
  tags: [],
} as unknown as DeckGetByIdResponseType;

// デッキコードは必ず20桁(6-6-6 をハイフンでつないだ形)
const DECK_CODE = "gnLgHn-ZzZzZz-QQLLgg";

/*
 * POST /api/deckcodes だけ指定の応答を返す。
 * 公式サイトのデッキコード確認(deckIDCheck.php)は「有効」、ほか(アイコン・タグの一覧など)は空で返す。
 */
const stubDeckCodePost = (respond: () => Response) => {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url) === "/api/deckcodes" && init?.method === "POST") return respond();
    if (String(url).includes("deckIDCheck.php")) {
      return new Response(JSON.stringify({ result: 1 }), { headers: json });
    }

    return new Response("[]", { headers: json });
  });
  vi.stubGlobal("fetch", fetchMock);

  return () =>
    fetchMock.mock.calls.filter(
      ([url, init]) => String(url) === "/api/deckcodes" && init?.method === "POST",
    ).length;
};

const createButton = () => screen.getByRole("button", { name: "作成" });
const codeInput = () => screen.getByLabelText("デッキコード") as HTMLInputElement;
const memoInput = () => screen.getByLabelText("メモ") as HTMLTextAreaElement;

const renderOpen = (props: {
  onOpenChange: () => void;
  setDeckCode: () => void;
}) =>
  render(
    // バージョン一覧・タグ一覧は SWR のグローバルキャッシュに載るので、テストごとに空のものを与える
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <CreateDeckCodeModal
        deck={deck}
        setDeck={() => {}}
        deckcode={null}
        setDeckCode={props.setDeckCode}
        isOpen
        onOpenChange={props.onOpenChange}
      />
    </SWRConfig>,
  );

/*
 * 新しいバージョンの作成に失敗しても入力を消さない。
 * 以前は失敗時にもモーダルを閉じる処理を呼んでおり、その後始末が入力を空に戻していたので、
 * デッキコード・メモ・タグ・アイコンを入れ直すことになっていた。
 */
describe("CreateDeckCodeModal", () => {
  it("失敗しても閉じず、入力したデッキコードとメモが残り、そのまま再送できる", async () => {
    const postCount = stubDeckCodePost(
      () => new Response(JSON.stringify({ message: "bad request" }), { status: 400, headers: json }),
    );
    const onOpenChange = vi.fn();
    const setDeckCode = vi.fn();
    renderOpen({ onOpenChange, setDeckCode });

    fireEvent.change(codeInput(), { target: { value: DECK_CODE } });
    fireEvent.change(memoInput(), { target: { value: "サイドを1枚入れ替えた" } });
    fireEvent.click(createButton());

    await waitFor(() => expect(postCount()).toBe(1));
    // 送信中は押せない。失敗の後始末が済むと、また押せる
    await waitFor(() => expect(createButton().hasAttribute("disabled")).toBe(false));

    expect(codeInput().value).toBe(DECK_CODE);
    expect(memoInput().value).toBe("サイドを1枚入れ替えた");
    expect(setDeckCode).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.click(createButton());
    await waitFor(() => expect(postCount()).toBe(2));
  });

  it("成功したら作ったバージョンを反映して閉じる", async () => {
    const postCount = stubDeckCodePost(
      () =>
        new Response(
          JSON.stringify({ id: "01KZNTTDTF88D814T7GQHGYNC1", deck_id: deck.id, code: DECK_CODE }),
          { status: 201, headers: json },
        ),
    );
    const onOpenChange = vi.fn();
    const setDeckCode = vi.fn();
    renderOpen({ onOpenChange, setDeckCode });

    fireEvent.change(codeInput(), { target: { value: DECK_CODE } });
    fireEvent.click(createButton());

    await waitFor(() => expect(setDeckCode).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalled());
    expect(postCount()).toBe(1);
  });

  /*
   * 新しいバージョンを作ると、デッキのタグもそのバージョンのタグに置き換わる(サーバが揃える)。
   * 手元のデッキにも当て、デッキ情報モーダル・一覧カードのタグをその場で揃える。
   */
  describe("デッキのタグを作ったバージョンのタグに揃える", () => {
    const tag = (id: string, name: string) =>
      ({ id, name, color: "", text_color: "", preset_flg: false }) as unknown as TagType;
    const oldTag = tag("01KZNTTDTF88D814T7GQHGTAG1", "前のACE SPEC");
    const newTag = tag("01KZNTTDTF88D814T7GQHGTAG2", "新しいACE SPEC");

    const renderWith = (props: {
      deck: DeckGetByIdResponseType;
      deckcode: DeckCodeType | null;
      setDeck: (update: unknown) => void;
    }) =>
      render(
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
          <CreateDeckCodeModal
            deck={props.deck}
            setDeck={props.setDeck as never}
            deckcode={props.deckcode}
            setDeckCode={() => {}}
            isOpen
            onOpenChange={() => {}}
          />
        </SWRConfig>,
      );

    // POST /api/deckcodes に送った本文
    const postedBody = () => {
      const call = vi
        .mocked(fetch)
        .mock.calls.find(
          ([url, init]) => String(url) === "/api/deckcodes" && init?.method === "POST",
        );

      return JSON.parse(String(call?.[1]?.body));
    };

    it("成功したら、手元のデッキのタグを作ったバージョンのタグで置き換える", async () => {
      stubDeckCodePost(
        () =>
          new Response(
            JSON.stringify({
              id: "01KZNTTDTF88D814T7GQHGYNC1",
              deck_id: deck.id,
              code: DECK_CODE,
              tags: [newTag],
            }),
            { status: 201, headers: json },
          ),
      );
      const setDeck = vi.fn();
      const deckWithOldTag = { ...deck, tags: [oldTag] } as DeckGetByIdResponseType;
      renderWith({ deck: deckWithOldTag, deckcode: null, setDeck });

      fireEvent.change(codeInput(), { target: { value: DECK_CODE } });
      fireEvent.click(createButton());

      await waitFor(() => expect(setDeck).toHaveBeenCalledTimes(1));
      const update = setDeck.mock.calls[0][0] as (
        prev: DeckGetByIdResponseType,
      ) => DeckGetByIdResponseType;
      expect(update(deckWithOldTag).tags).toEqual([newTag]);
    });

    it("作ったバージョンがタグなしなら、デッキのタグも外す", async () => {
      stubDeckCodePost(
        () =>
          new Response(
            JSON.stringify({
              id: "01KZNTTDTF88D814T7GQHGYNC1",
              deck_id: deck.id,
              code: DECK_CODE,
              tags: [],
            }),
            { status: 201, headers: json },
          ),
      );
      const setDeck = vi.fn();
      const deckWithOldTag = { ...deck, tags: [oldTag] } as DeckGetByIdResponseType;
      // 元にしたバージョンがタグなしなら、タグなしで作られる
      const base = { id: "01KZNTTDTF88D814T7GQHGYNB1", deck_id: deck.id, code: DECK_CODE, tags: [] };
      renderWith({ deck: deckWithOldTag, deckcode: base as unknown as DeckCodeType, setDeck });

      fireEvent.change(codeInput(), { target: { value: DECK_CODE } });
      fireEvent.click(createButton());

      await waitFor(() => expect(setDeck).toHaveBeenCalledTimes(1));
      expect(postedBody().tag_ids).toEqual([]);
      const update = setDeck.mock.calls[0][0] as (
        prev: DeckGetByIdResponseType,
      ) => DeckGetByIdResponseType;
      expect(update(deckWithOldTag).tags).toEqual([]);
    });

    /*
     * 最初のバージョンは元にするバージョンが無い。空のタグで作ると、デッキ登録時に付けたタグが
     * 消えてしまうので、デッキのタグで始める。
     * バージョンの無いデッキは id の空の latest_deck_code を持つことがあり、それも「元が無い」と扱う
     */
    it.each([
      ["null", null],
      ["id の空のもの", { id: "", code: "", tags: null } as unknown as DeckCodeType],
    ])("元にするバージョンが無い(%s)ときは、デッキのタグを付けて作る", async (_, deckcode) => {
      stubDeckCodePost(
        () =>
          new Response(
            JSON.stringify({
              id: "01KZNTTDTF88D814T7GQHGYNC1",
              deck_id: deck.id,
              code: DECK_CODE,
              tags: [oldTag],
            }),
            { status: 201, headers: json },
          ),
      );
      const setDeck = vi.fn();
      renderWith({ deck: { ...deck, tags: [oldTag] } as DeckGetByIdResponseType, deckcode, setDeck });

      fireEvent.change(codeInput(), { target: { value: DECK_CODE } });
      fireEvent.click(createButton());

      await waitFor(() => expect(setDeck).toHaveBeenCalledTimes(1));
      expect(postedBody().tag_ids).toEqual([oldTag.id]);
    });
  });
});
