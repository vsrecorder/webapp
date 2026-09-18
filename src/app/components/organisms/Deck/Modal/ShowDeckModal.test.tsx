// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ShowDeckModal from "@app/components/organisms/Deck/Modal/ShowDeckModal";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { TagType } from "@app/types/tag";

// きずなLv.・バージョン・公開状況の取得はここでは空で返しておく
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () => new Response("[]", { headers: { "content-type": "application/json" } }),
    ),
  );
});

afterEach(cleanup);

const tag = (id: string, name: string): TagType =>
  ({ id, name, color: "", text_color: "", preset_flg: false }) as unknown as TagType;

const deckWith = (tags: TagType[]) =>
  ({
    id: "01KZNTTDTF88D814T7GQHGYNTX",
    name: "テストデッキ",
    user_id: "u1",
    private_flg: true,
    pokemon_sprites: [],
    tags,
  }) as unknown as DeckGetByIdResponseType;

// SWR のキャッシュはグローバルなので、テストごとに空のものを与える
const renderModal = (deck: DeckGetByIdResponseType) =>
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <ShowDeckModal
        deck={deck}
        setDeck={() => {}}
        deckcode={null}
        setDeckCode={() => {}}
        isOpen
        onOpenChange={() => {}}
        onRemove={() => {}}
        autoOpenHistory={false}
        onAutoOpenHistoryHandled={() => {}}
      />
    </SWRConfig>,
  );

const header = () => screen.getByRole("dialog").querySelector("header")!;

describe("ShowDeckModal", () => {
  it("デッキに付けたタグをデッキ名の下に出す", () => {
    renderModal(deckWith([tag("t1", "大会用"), tag("t2", "調整中")]));

    expect(header().textContent).toContain("大会用");
    expect(header().textContent).toContain("調整中");
  });

  it("タグが無いデッキでも、タグ1行ぶんの場所を空けておく", () => {
    // 空けておかないと、タグの有無でヘッダーの高さが変わり、
    // デッキ画像から下の位置がデッキごとにずれる
    renderModal(deckWith([]));

    expect(header().querySelector("[aria-hidden].h-5")).not.toBeNull();
  });
});
