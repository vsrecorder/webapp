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

// 類似デッキのシートも createLazyModal 経由。ここでは渡すデッキコードと呼び名だけを見る
const similarDecksModalProps = vi.fn();
vi.mock("@app/components/organisms/Deck/Modal/DisplaySimilarDecksModal", () => ({
  default: (props: { isOpen: boolean }) => {
    similarDecksModalProps(props);
    return props.isOpen ? <div data-testid="similar-decks-modal" /> : null;
  },
}));

afterEach(() => {
  cleanup();
  similarDecksModalProps.mockClear();
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

      // 「このデッキコードでデッキを登録」はトレーナー情報・デッキ情報のカードと同じ幅にする
      // (列の幅ではなく、フッターの左右余白を ModalBody の p-3 と揃える)
      const button = screen.getByRole("button", { name: "このデッキコードでデッキを登録" });
      expect(button.closest("footer")!.className).toContain("px-3");
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original;
      if (offsetWidth) Object.defineProperty(HTMLElement.prototype, "offsetWidth", offsetWidth);
    }
  });
});

describe("CityleagueResultCard の表示", () => {
  it("「主なポケモン」の行は出さない(デッキ分類の表示に置き換えた)", () => {
    render(
      <CityleagueResultCard
        result={result}
        date={new Date()}
        deckArchetype={archetype}
        deckSummary={{
          code: DECK_CODE,
          total: 60,
          mainPokemon: ["ドラパルトex", "バシャーモex"],
          aceSpec: null,
          groups: [],
        }}
      />,
    );

    expect(screen.queryByText(/主なポケモン/)).toBeNull();
    expect(screen.getByText(`デッキコード ${DECK_CODE}`)).toBeTruthy();
    // 画像の alt は分類の名前で呼ぶ
    expect(screen.getByAltText(/ドラパルトex バシャーモ型/)).toBeTruthy();
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

  it("「類似している入賞デッキを見る」で、この入賞デッキのコードを「このデッキ」として比べるシートを開く", async () => {
    render(<CityleagueResultCard result={result} date={new Date()} deckArchetype={archetype} />);

    fireEvent.click(screen.getByText(`デッキコード ${DECK_CODE}`));
    fireEvent.click(await screen.findByRole("button", { name: "類似している入賞デッキを見る" }));

    await waitFor(() => expect(screen.getByTestId("similar-decks-modal")).toBeTruthy());
    expect(similarDecksModalProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ code: DECK_CODE, sourceLabel: "このデッキ", isOpen: true }),
    );
  });

  it("デッキコードの無い入賞には類似デッキのボタンを出さない", async () => {
    render(
      <CityleagueResultCard result={{ ...result, deck_code: "" }} date={new Date()} />,
    );

    fireEvent.click(screen.getByText("デッキコードなし"));
    await screen.findByRole("dialog");

    expect(screen.queryByRole("button", { name: "類似している入賞デッキを見る" })).toBeNull();
  });
});
