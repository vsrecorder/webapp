// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CreateDeckModal from "@app/components/organisms/Deck/Modal/CreateDeckModal";

import { DeckPokemonSpriteType } from "@app/types/pokemon_sprite";

// アイコン一覧(/api/pokemon-sprites)・デッキコード確認とも、ここでは空で返しておく。
// 一覧が届く前でも id から画像を組めることの確認も兼ねる。
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () => new Response("[]", { headers: { "content-type": "application/json" } }),
    ),
  );
});

// PokemonSprite は id(先頭ゼロ除去)を alt に出す。アイコン無しは "unknown"
const spriteIds = () =>
  screen
    .getAllByRole("img")
    .map((img) => img.getAttribute("alt"))
    .filter((alt): alt is string => alt !== null);

const renderModal = (props: {
  isOpen: boolean;
  initialName?: string;
  initialSprites?: DeckPokemonSpriteType[];
}) =>
  render(
    <CreateDeckModal
      deck_code=""
      initialName={props.initialName}
      initialSprites={props.initialSprites}
      isOpen={props.isOpen}
      onOpenChange={() => {}}
      onCreated={() => {}}
    />,
  );

describe("CreateDeckModal", () => {
  // みんなの公開デッキの「デッキ登録」は createLazyModal 経由で、開かれてから初めて
  // マウントされる(＝最初の描画時点で既に isOpen)。初期値の入れ直しが isOpen の
  // 変化頼みだと、この経路でだけアイコンが空のままになる
  it("開いた状態でマウントされても初期スプライトが入る", () => {
    renderModal({
      isOpen: true,
      initialName: "テストデッキ",
      initialSprites: [
        { id: "0006", position: 1 },
        { id: "0025", position: 2 },
      ],
    });

    expect(spriteIds()).toEqual(["6", "25"]);
    expect(screen.getByLabelText(/デッキ名/).getAttribute("value")).toBe("テストデッキ");
  });

  it("閉じた状態でマウントしてから開いても初期スプライトが入る", () => {
    const initialSprites: DeckPokemonSpriteType[] = [{ id: "0006", position: 1 }];
    const { rerender } = renderModal({ isOpen: false, initialSprites });

    rerender(
      <CreateDeckModal
        deck_code=""
        initialSprites={initialSprites}
        isOpen
        onOpenChange={() => {}}
        onCreated={() => {}}
      />,
    );

    expect(spriteIds()).toEqual(["6", "unknown"]);
  });

  it("初期スプライトが無ければ空枠のまま", () => {
    renderModal({ isOpen: true });

    expect(spriteIds()).toEqual(["unknown", "unknown"]);
  });
});
