// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import UpdateDeckModal from "@app/components/organisms/Deck/Modal/UpdateDeckModal";

import { DeckGetByIdResponseType } from "@app/types/deck";

// アイコン一覧(/api/pokemon-sprites)・タグ一覧(/api/tags)とも、ここでは空で返しておく。
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () => new Response("[]", { headers: { "content-type": "application/json" } }),
    ),
  );
});

// vitest.config.ts は globals を有効にしていないため、testing-library の
// 自動クリーンアップが登録されない。明示的に消さないと前のテストのモーダルが
// DOM に残り、次のテストの getBy* が「複数見つかった」で落ちる。
afterEach(cleanup);

const deck = {
  id: "01KZNTTDTF88D814T7GQHGYNTX",
  name: "テストデッキ",
  user_id: "u1",
  private_flg: true,
  pokemon_sprites: [],
  tags: [],
} as unknown as DeckGetByIdResponseType;

// errorMessage にも「デッキ名」が出るため、ラベルは完全一致で引く
const deckNameInput = () => screen.getByLabelText("デッキ名") as HTMLInputElement;

const renderModal = (props: { deck: DeckGetByIdResponseType | null; isOpen: boolean }) =>
  render(
    <UpdateDeckModal
      deck={props.deck}
      setDeck={() => {}}
      isOpen={props.isOpen}
      onOpenChange={() => {}}
    />,
  );

describe("UpdateDeckModal", () => {
  // デッキ詳細モーダル(ShowDeckModal)は createLazyModal 経由で、開かれてから初めて
  // マウントされる。その中に置かれているこのモーダルも、deck が既にある状態で
  // マウントされる。入力欄への入れ直しが「deck の参照が変わったとき」頼みだと、
  // この経路でだけデッキ名が空のままになり、name が空のまま更新できてしまう
  // (上流が400を返す)
  it("開いた状態でマウントされてもデッキ名が入る", () => {
    renderModal({ deck, isOpen: true });

    expect(deckNameInput().value).toBe("テストデッキ");
  });

  it("デッキがある状態で閉じたままマウントし、その後開いてもデッキ名が入る", () => {
    const { rerender } = renderModal({ deck, isOpen: false });

    rerender(
      <UpdateDeckModal deck={deck} setDeck={() => {}} isOpen onOpenChange={() => {}} />,
    );

    expect(deckNameInput().value).toBe("テストデッキ");
  });

  it("デッキが後から届いた場合もデッキ名が入る", () => {
    const { rerender } = renderModal({ deck: null, isOpen: true });

    rerender(
      <UpdateDeckModal deck={deck} setDeck={() => {}} isOpen onOpenChange={() => {}} />,
    );

    expect(deckNameInput().value).toBe("テストデッキ");
  });

  // タグ管理中に閉じる手段を全部塞ぐと、「管理を終了」を押すまで抜けられなくなる。
  // タグの削除は確認を挟んで即時反映されるので、閉じても失われる編集は無い
  it("タグ管理中でも閉じる導線が残る", async () => {
    // 「タグを管理」は自分のタグが1つ以上あるときだけ出る
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).includes("/presets")
          ? new Response("[]", { headers: { "content-type": "application/json" } })
          : new Response(
              JSON.stringify([
                {
                  id: "t1",
                  created_at: "2026-09-01T00:00:00Z",
                  name: "大会用",
                  color: "",
                  text_color: "",
                  preset_flg: false,
                },
              ]),
              { headers: { "content-type": "application/json" } },
            ),
      ),
    );
    // タグ一覧は SWR のグローバルキャッシュに載るので、このテストだけ空のものを与える
    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <UpdateDeckModal deck={deck} setDeck={() => {}} isOpen onOpenChange={() => {}} />
      </SWRConfig>,
    );

    const manage = await screen.findByRole("button", { name: "タグを管理" });
    fireEvent.click(manage);
    expect(screen.getByRole("button", { name: "管理を終了" })).toBeTruthy();

    // フッターの「閉じる」(HeroUI の dismiss ボタンも同名なので、表示テキストで絞る)
    const close = screen.getAllByRole("button").filter((b) => b.textContent === "閉じる");
    expect(close.length).toBe(1);
    expect(close[0].hasAttribute("disabled")).toBe(false);
  });

  // デッキ名が空のままでは更新させない(上流は name が空だと400を返す)
  it("デッキ名を空にすると更新ボタンを押せない", () => {
    renderModal({ deck, isOpen: true });

    fireEvent.change(deckNameInput(), { target: { value: "" } });

    expect(screen.getByRole("button", { name: "更新" }).hasAttribute("disabled")).toBe(
      true,
    );
  });
});
