// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CityleagueResultCard from "@app/components/organisms/Cityleague/CityleagueResultCard";

import { DeckArchetypeType } from "@app/types/deck_archetype";

// 会員のときだけ「このデッキコードでデッキを登録」が出る
vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "authenticated" }),
}));

// 登録モーダルは createLazyModal 経由で import() される。ここでは受け取った初期値だけを見たいので、
// 本物(アイコン一覧の取得・デッキコードの外部確認を伴う)の代わりに props を記録する部品に差し替える
const createDeckModalProps = vi.fn();
vi.mock("@app/components/organisms/Deck/Modal/CreateDeckModal", () => ({
  default: (props: { isOpen: boolean }) => {
    createDeckModalProps(props);
    return props.isOpen ? <div data-testid="create-deck-modal" /> : null;
  },
}));

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () => new Response("[]", { headers: { "content-type": "application/json" } }),
    ),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  createDeckModalProps.mockClear();
});

const DECK_CODE = "kfwFfb-NhLBlj-fdVkbF";

const result = {
  player_id: "0010864458",
  player_name: "たけこ",
  rank: 1,
  deck_code: DECK_CODE,
};

const archetype: DeckArchetypeType = {
  deckCode: DECK_CODE,
  archetypeName: "ドラパルトex",
  variantName: "バシャーモ型",
  label: "ドラパルトex バシャーモ型",
  sprites: ["0887", "0257"],
};

// カードをタップして詳細モーダルを開き、「このデッキコードでデッキを登録」を押す
async function openCreateDeckModal() {
  fireEvent.click(screen.getByText(`デッキコード ${DECK_CODE}`));

  const button = await screen.findByRole("button", { name: "このデッキコードでデッキを登録" });
  fireEvent.click(button);

  await waitFor(() => expect(screen.getByTestId("create-deck-modal")).toBeTruthy());
}

describe("CityleagueResultCard のデッキ登録", () => {
  it("分類が付いていれば、その名前とアイコンを入れた状態で登録モーダルを開く", async () => {
    render(<CityleagueResultCard result={result} date={new Date()} deckArchetype={archetype} />);

    await openCreateDeckModal();

    expect(createDeckModalProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        deck_code: DECK_CODE,
        initialName: "ドラパルトex バシャーモ型",
        initialSprites: [
          { id: "0887", position: 1 },
          { id: "0257", position: 2 },
        ],
        isOpen: true,
      }),
    );
  });

  it("分類が無ければ名前もアイコンも空で開く(これまでどおり自分で入れる)", async () => {
    render(<CityleagueResultCard result={result} date={new Date()} />);

    await openCreateDeckModal();

    expect(createDeckModalProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ initialName: "", initialSprites: [], isOpen: true }),
    );
  });

  it("未分類は名前が無いので空で開き、カードには「デッキ名：不明」と出る", async () => {
    render(
      <CityleagueResultCard
        result={result}
        date={new Date()}
        deckArchetype={{ ...archetype, archetypeName: null, variantName: null, label: null, sprites: [] }}
      />,
    );

    expect(screen.getByText("デッキ名：不明")).toBeTruthy();

    await openCreateDeckModal();

    expect(createDeckModalProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ initialName: "", initialSprites: [] }),
    );
  });
});
