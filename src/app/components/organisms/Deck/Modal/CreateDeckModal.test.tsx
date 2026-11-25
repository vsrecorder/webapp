// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

afterEach(cleanup);

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
  /*
   * 登録の失敗(デッキコードが無効・公式サイトのメンテナンス・通信断など)で入力を消さない。
   * 以前は失敗時にもモーダルを閉じる処理を呼んでおり、その後始末が入力を初期値へ戻していたので、
   * デッキ名・デッキコード・アイコン・タグを入れ直すことになっていた。
   */
  describe("登録の結果", () => {
    const json = { "content-type": "application/json" };
    const registerButton = () => screen.getByRole("button", { name: "登録" });
    const nameInput = () => screen.getByLabelText(/デッキ名/) as HTMLInputElement;

    // POST /api/decks だけ指定の応答を返し、ほか(アイコン・タグの一覧など)は空で返す
    const stubDeckPost = (respond: () => Response) => {
      const fetchMock = vi.fn(async (url: string, init?: RequestInit) =>
        String(url) === "/api/decks" && init?.method === "POST"
          ? respond()
          : new Response("[]", { headers: json }),
      );
      vi.stubGlobal("fetch", fetchMock);

      return () =>
        fetchMock.mock.calls.filter(
          ([url, init]) => String(url) === "/api/decks" && init?.method === "POST",
        ).length;
    };

    const renderOpen = (onOpenChange: () => void, onCreated: () => void) =>
      render(
        <CreateDeckModal deck_code="" isOpen onOpenChange={onOpenChange} onCreated={onCreated} />,
      );

    it("失敗しても閉じず、入力したデッキ名が残り、そのまま再送できる", async () => {
      const postCount = stubDeckPost(
        () => new Response(JSON.stringify({ message: "bad request" }), { status: 400, headers: json }),
      );
      const onOpenChange = vi.fn();
      const onCreated = vi.fn();
      renderOpen(onOpenChange, onCreated);

      fireEvent.change(nameInput(), { target: { value: "入力したデッキ名" } });
      fireEvent.click(registerButton());

      await waitFor(() => expect(postCount()).toBe(1));
      // 送信中は押せない。失敗の後始末が済むと、また押せる
      await waitFor(() => expect(registerButton().hasAttribute("disabled")).toBe(false));

      expect(nameInput().value).toBe("入力したデッキ名");
      expect(onCreated).not.toHaveBeenCalled();
      expect(onOpenChange).not.toHaveBeenCalled();

      fireEvent.click(registerButton());
      await waitFor(() => expect(postCount()).toBe(2));
    });

    it("通信に失敗しても閉じず、入力したデッキ名が残る", async () => {
      const postCount = stubDeckPost(() => {
        throw new TypeError("Failed to fetch");
      });
      const onOpenChange = vi.fn();
      renderOpen(onOpenChange, () => {});

      fireEvent.change(nameInput(), { target: { value: "入力したデッキ名" } });
      fireEvent.click(registerButton());

      await waitFor(() => expect(postCount()).toBe(1));
      await waitFor(() => expect(registerButton().hasAttribute("disabled")).toBe(false));

      expect(nameInput().value).toBe("入力したデッキ名");
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("成功したら登録を知らせて閉じる", async () => {
      const postCount = stubDeckPost(() => new Response("{}", { status: 201, headers: json }));
      const onOpenChange = vi.fn();
      const onCreated = vi.fn();
      renderOpen(onOpenChange, onCreated);

      fireEvent.change(nameInput(), { target: { value: "入力したデッキ名" } });
      fireEvent.click(registerButton());

      await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(onOpenChange).toHaveBeenCalled());
      expect(postCount()).toBe(1);
    });

    // 保存は済んでいるので、開いたままにすると、もう一度押して同じデッキが二重に登録される
    it("保存が済んだあとの後処理で失敗した場合は閉じる", async () => {
      const postCount = stubDeckPost(() => new Response("{}", { status: 201, headers: json }));
      const onOpenChange = vi.fn();
      const onCreated = vi.fn(() => {
        throw new Error("後処理の失敗");
      });
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      renderOpen(onOpenChange, onCreated);

      fireEvent.change(nameInput(), { target: { value: "入力したデッキ名" } });
      fireEvent.click(registerButton());

      await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(onOpenChange).toHaveBeenCalled());
      expect(postCount()).toBe(1);

      consoleError.mockRestore();
    });
  });
});
