// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DeckCard from "@app/components/organisms/Deck/DeckCard";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";

// バージョン一覧モーダルが、自分のデッキかどうか(戦績を出すか)の判定にセッションを見る
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "u1" } } }),
}));

// jsdom は ResizeObserver を持たない。タグの候補行(HScrollRow)が溢れ判定に使う
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const json = { "content-type": "application/json" };

// デッキコードは必ず20桁(6-6-6 をハイフンでつないだ形)
const OLD_CODE = "aaaaaa-AAAAAA-aaaaaa";
const NEW_CODE = "gnLgHn-ZzZzZz-QQLLgg";

const version = (id: string, code: string) =>
  ({ id, deck_id: "D1", code, tags: [], pokemon_sprites: [] }) as unknown as DeckCodeType;

const oldVersion = version("V1", OLD_CODE);
const newVersion = version("V2", NEW_CODE);

// 一覧(Decks)が渡すデッキ。呼ぶたびに別のオブジェクトになる(取り直し・お気に入りの切り替えと同じ)
const deckWith = (latest: DeckCodeType) =>
  ({
    id: "D1",
    name: "テストデッキ",
    user_id: "u1",
    private_flg: true,
    pokemon_sprites: [],
    tags: [],
    latest_deck_code: latest,
    created_at: "2026-11-01T00:00:00+09:00",
    archived_at: "0001-01-01T00:00:00Z",
  }) as unknown as DeckGetByIdResponseType;

/*
 * 新しいバージョンの作成(POST /api/deckcodes)は newVersion を返す。
 * 公式サイトのデッキコード確認(deckIDCheck.php)は「有効」、ほか(きずな・タグなど)は空で返す。
 */
beforeEach(() => {
  let created = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url);
      if (u === "/api/deckcodes" && init?.method === "POST") {
        created = true;
        return new Response(JSON.stringify(newVersion), { status: 201, headers: json });
      }
      if (u.includes("deckIDCheck.php")) {
        return new Response(JSON.stringify({ result: 1 }), { headers: json });
      }
      if (u === "/api/decks/D1/deckcodes") {
        return new Response(JSON.stringify(created ? [newVersion, oldVersion] : [oldVersion]), {
          headers: json,
        });
      }

      return new Response("[]", { headers: json });
    }),
  );
});

afterEach(cleanup);

type CardProps = { deck: DeckGetByIdResponseType; refreshCount: number };

// SWR のキャッシュはグローバルなので、テストごとに空のものを与える
const cardElement = ({ deck, refreshCount }: CardProps) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    <DeckCard
      deckData={deck}
      deckcodeData={deck.latest_deck_code}
      refreshCount={refreshCount}
      onRemove={() => {}}
      enableShowDeckModal
      view="list"
    />
  </SWRConfig>
);

// カードをタップしてデッキ情報モーダルを開く(モーダルは遅延読み込みなので現れるまで待つ)
const openDeckModal = async () => {
  fireEvent.click(screen.getByText("テストデッキ"));

  return await screen.findByRole("dialog", {}, { timeout: 5000 });
};

describe("DeckCard", () => {
  /*
   * ブラウザの「戻る」では一覧の初期データが使い回され、カードは古いデッキで描かれる。
   * 一覧はマウント直後に取り直して差し替える(refreshCount が増える)。
   * カードが初期値しか見ていなかったため、デッキ詳細ページで新しいバージョンを作って戻ると、
   * 自動で開き直したデッキ情報モーダルが前のバージョンを出したままになっていた。
   */
  it("一覧が取り直したら、開いているデッキ情報モーダルも取り直したバージョンを出す", async () => {
    const { rerender } = render(cardElement({ deck: deckWith(oldVersion), refreshCount: 0 }));
    const dialog = await openDeckModal();
    expect(dialog.textContent).toContain(OLD_CODE);

    rerender(cardElement({ deck: deckWith(newVersion), refreshCount: 1 }));

    await waitFor(() => expect(dialog.textContent).toContain(NEW_CODE));
    expect(dialog.textContent).not.toContain(OLD_CODE);
  });

  /*
   * お気に入りの切り替えでも一覧はデッキのオブジェクトを作り直して渡すが、一覧は
   * カードのモーダルで作ったバージョンを知らない。渡されるデータが変わるたびに入れ直すと、
   * 作ったばかりのバージョンが古いものへ戻ってしまう。
   */
  it("取り直し以外で渡すデータが変わっても、モーダルで作ったバージョンを古いものへ戻さない", async () => {
    const { rerender } = render(cardElement({ deck: deckWith(oldVersion), refreshCount: 0 }));
    const dialog = await openDeckModal();

    fireEvent.click(within(dialog).getByRole("button", { name: /新バージョン/ }));
    const input = (await screen.findByLabelText("デッキコード")) as HTMLInputElement;
    fireEvent.change(input, { target: { value: NEW_CODE } });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "作成" }).hasAttribute("disabled")).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "作成" }));
    await waitFor(() => expect(dialog.textContent).toContain(NEW_CODE));

    // お気に入りの切り替え: 一覧の手元にある(古いバージョンの)デッキを作り直して渡す
    rerender(cardElement({ deck: deckWith(oldVersion), refreshCount: 0 }));

    expect(dialog.textContent).toContain(NEW_CODE);
    expect(dialog.textContent).not.toContain(OLD_CODE);
  });
});
