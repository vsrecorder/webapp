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

describe("CityleagueResultCard の詳細モーダル", () => {
  it("モーダルのデッキ情報は、カードの画像と同じ幅(パネルの内側まで)の列にまとめて中央に置く", async () => {
    // jsdom はレイアウトを持たないので、カードの画像枠のレイアウト上の幅を 346px に固定する。
    // 見た目の幅(getBoundingClientRect)は押下中の縮小を含むので、それとは違う値にしておき、
    // offsetWidth のほうで測っていることも確かめる
    const offsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 346 });
    const original = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function () {
      return { ...original.call(this), width: 346 * 0.98 } as DOMRect;
    };

    try {
      render(<CityleagueResultCard result={result} date={new Date()} deckArchetype={archetype} />);

      fireEvent.click(screen.getByText(`デッキコード ${DECK_CODE}`));

      const dialog = await screen.findByRole("dialog");
      const image = dialog.querySelector('img[src*="images/decks"]')!;
      // 画像を含むデッキ情報の列。デッキコード欄も同じ列に入る(画像だけ幅が違うと端が揃わない)
      const column = image.closest("div[style]") as HTMLElement;

      expect(column.style.width).toBe("346px");
      // パネルの余白を優先し、内側より広いときは内側いっぱいまでに縮める
      expect(column.className).toContain("max-w-full");
      expect(column.className).toContain("mx-auto");
      expect(column.textContent).toContain(DECK_CODE);
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original;
      if (offsetWidth) Object.defineProperty(HTMLElement.prototype, "offsetWidth", offsetWidth);
    }
  });
});

describe("CityleagueResultCard のデッキ登録", () => {
  it("分類が付いていれば、主デッキ名(型名は含めない)とアイコンを入れた状態で登録モーダルを開く", async () => {
    render(<CityleagueResultCard result={result} date={new Date()} deckArchetype={archetype} />);

    await openCreateDeckModal();

    expect(createDeckModalProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        deck_code: DECK_CODE,
        initialName: "ドラパルトex",
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
