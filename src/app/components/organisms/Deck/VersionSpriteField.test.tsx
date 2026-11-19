// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Dispatch, SetStateAction } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import VersionSpriteField from "@app/components/organisms/Deck/VersionSpriteField";

import { DeckPokemonSpriteType, PokemonSpriteType } from "@app/types/pokemon_sprite";

/*
 * アイコン選択モーダルは差し替える。ここで見たいのは「モーダルから返ってきた選択を、
 * API へ送る形(枠つきの配列)へ正しく直せているか」で、モーダル自体の操作は対象外。
 * 渡された setter を控えておき、テストから「決定」と同じ順(1枠目 → 2枠目)で呼ぶ。
 */
type Setter = Dispatch<SetStateAction<PokemonSpriteType | null>>;
const modalProps: {
  setPokemonSprite1?: Setter;
  setPokemonSprite2?: Setter;
  pokemonSprite1?: PokemonSpriteType | null;
  pokemonSprite2?: PokemonSpriteType | null;
} = {};

vi.mock("@app/components/organisms/Match/Modal/PokemonSpriteModal", () => ({
  default: (props: typeof modalProps) => {
    Object.assign(modalProps, props);
    return null;
  },
}));

// アイコン一覧(/api/pokemon-sprites)。名前の解決に使うだけなので空で返しておく
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () => new Response("[]", { headers: { "content-type": "application/json" } }),
    ),
  );
});

// vitest.config.ts は globals を有効にしていないため、明示的に片付ける
afterEach(cleanup);

const sprite = (id: string): PokemonSpriteType => ({ id, name: id, image_url: "" });

const deckSprites: DeckPokemonSpriteType[] = [
  { id: "0257", position: 1 },
  { id: "0887", position: 2 },
];

// 「決定」と同じく 1枠目 → 2枠目 の順で続けて呼ぶ
const decide = (sprite1: PokemonSpriteType | null, sprite2: PokemonSpriteType | null) => {
  modalProps.setPokemonSprite1?.(sprite1);
  modalProps.setPokemonSprite2?.(sprite2);
};

describe("VersionSpriteField", () => {
  it("未設定のときはデッキのアイコンが表示されることを案内し、戻すボタンは出さない", () => {
    render(<VersionSpriteField value={[]} onChange={() => {}} deckSprites={deckSprites} />);

    expect(screen.getByText("未設定のときはデッキのアイコンを表示します")).toBeTruthy();
    expect(screen.queryByText("デッキのアイコンに戻す")).toBeNull();
    // モーダルへは空の選択を渡す(デッキのスプライトで埋めない)
    expect(modalProps.pokemonSprite1).toBeNull();
    expect(modalProps.pokemonSprite2).toBeNull();
  });

  it("両方の枠を同時に変えても、1回の onChange で両方が反映される", () => {
    // 決定は setter を続けて2回呼ぶ。枠ごとに onChange すると、2回目が1回目の反映前の値を
    // 元に組み立てられて1枠目の変更を打ち消すため、まとめて1回で返す
    const onChange = vi.fn();
    render(
      <VersionSpriteField
        value={[{ id: "0257", position: 1 }]}
        onChange={onChange}
        deckSprites={deckSprites}
      />,
    );

    decide(sprite("0887"), sprite("0006"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([
      { id: "0887", position: 1 },
      { id: "0006", position: 2 },
    ]);
  });

  it("1枠目を空にして2枠目だけ選んだときは position:2 のまま返す", () => {
    const onChange = vi.fn();
    render(<VersionSpriteField value={[]} onChange={onChange} deckSprites={deckSprites} />);

    decide(null, sprite("0006"));

    expect(onChange).toHaveBeenCalledWith([{ id: "0006", position: 2 }]);
  });

  it("両方の枠を外すと空配列(未設定)を返す", () => {
    const onChange = vi.fn();
    render(
      <VersionSpriteField
        value={[{ id: "0887", position: 1 }]}
        onChange={onChange}
        deckSprites={deckSprites}
      />,
    );

    decide(null, null);

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("「デッキのアイコンに戻す」で空配列(未設定)を返す", () => {
    const onChange = vi.fn();
    render(
      <VersionSpriteField
        value={[{ id: "0887", position: 1 }]}
        onChange={onChange}
        deckSprites={deckSprites}
      />,
    );

    fireEvent.click(screen.getByText("デッキのアイコンに戻す"));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("最新バージョンに設定があるときだけ、デッキのアイコンにもなることを案内する", () => {
    const hint = "最新バージョンなので、デッキアイコンにもなります";
    const set = [{ id: "0887", position: 1 }];

    const { rerender } = render(
      <VersionSpriteField value={set} onChange={() => {}} deckSprites={deckSprites} syncsDeck />,
    );
    expect(screen.getByText(hint)).toBeTruthy();

    // 過去のバージョンではデッキは変わらない
    rerender(<VersionSpriteField value={set} onChange={() => {}} deckSprites={deckSprites} />);
    expect(screen.queryByText(hint)).toBeNull();

    // 未設定の最新バージョンはデッキのアイコンで表示されるだけで、デッキは変わらない
    rerender(
      <VersionSpriteField value={[]} onChange={() => {}} deckSprites={deckSprites} syncsDeck />,
    );
    expect(screen.queryByText(hint)).toBeNull();
  });

  it("処理中(isDisabled)は戻すボタンを出さない", () => {
    render(
      <VersionSpriteField
        value={[{ id: "0887", position: 1 }]}
        onChange={() => {}}
        deckSprites={deckSprites}
        isDisabled
      />,
    );

    expect(screen.queryByText("デッキのアイコンに戻す")).toBeNull();
  });
});
