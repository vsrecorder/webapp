// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";

import CreateDeckCodeModal from "@app/components/organisms/Deck/Modal/CreateDeckCodeModal";

import { DeckGetByIdResponseType } from "@app/types/deck";

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
});
