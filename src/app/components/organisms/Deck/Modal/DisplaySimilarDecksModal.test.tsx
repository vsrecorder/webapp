// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DisplaySimilarDecksModal from "@app/components/organisms/Deck/Modal/DisplaySimilarDecksModal";

import { clearDeckCardImageMapCache } from "@app/utils/deckCardImages";

/*
 * 差分カードのタグをタップしたら、そのカードの画像が出ることの確認。
 *
 * 見るべきは「どちらのデッキの内訳を引くか」。カード名から画像は引けないので、
 * 入賞デッキにだけあるカードは入賞デッキの内訳、検索元のデッキにだけあるカードは
 * 検索元のデッキの内訳を引く(取り違えると、そのデッキに無いカードを探すことになり
 * いつまでも画像が出ない)。
 */

const SOURCE_CODE = "aaaaaa-bbbbbb-cccccc";
const WINNER_CODE = "dddddd-eeeeee-ffffff";
const IMAGE_BASE = "https://www.pokemon-card.com/assets/images/card_images/large";

// BFF(/api/deckcards/{code}/similar)が返す形。表示に要る項目だけ
const similarBody = {
  source: {
    deckCode: SOURCE_CODE,
    origin: "external",
    environmentId: "m6a",
    environmentTitle: "30th CELEBRATION",
    archetype: {
      archetypeId: "dragapult",
      archetypeName: "ドラパルトex",
      variantName: null,
      label: "ドラパルトex",
      sprites: [],
    },
    archetypeSkipped: false,
    placements: 0,
    unresolved: [],
  },
  similar: [
    {
      entryId: "entry-1",
      deckCode: WINNER_CODE,
      similarity: 0.935,
      eventDate: "2026-09-26T00:00:00+09:00",
      prefectureName: "東京都",
      leagueName: "シティリーグ",
      rank: 1,
      diffIn: ["ロストスイーパー"],
      diffOut: ["ネストボール"],
      archetype: {
        archetypeId: "dragapult",
        archetypeName: "ドラパルトex",
        variantName: null,
        label: "ドラパルトex",
        sprites: [],
      },
      sameArchetype: true,
      sameList: false,
    },
  ],
  candidates: 120,
};

const card = (name: string, id: string) => ({
  card_id: id,
  card_name: name,
  card_count: 1,
  detail_url: "",
  image_url: `${IMAGE_BASE}/${id}.jpg`,
});

const detailOf = (cards: ReturnType<typeof card>[]) => ({
  card_pke: [],
  card_pke_count: 0,
  card_gds: cards,
  card_gds_count: cards.length,
  card_tool: [],
  card_tool_count: 0,
  card_tech: [],
  card_tech_count: 0,
  card_sup: [],
  card_sup_count: 0,
  card_sta: [],
  card_sta_count: 0,
  card_ene: [],
  card_ene_count: 0,
});

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });

let requested: string[] = [];

beforeEach(() => {
  requested = [];
  // 内訳はデッキコードごとに覚えられるので、テストごとに捨てる
  clearDeckCardImageMapCache();

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = String(input);
      requested.push(url);

      if (url.includes("/similar")) return json(similarBody);

      if (url.includes("/detail")) {
        return json(
          url.includes(WINNER_CODE)
            ? detailOf([card("ロストスイーパー", "5")])
            : detailOf([card("ネストボール", "3")]),
        );
      }

      return json({});
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// 一覧の実体化は入場アニメーションの着地(480ms)を待つので、そこまで待ってから触る
const openModal = async () => {
  render(
    <DisplaySimilarDecksModal
      code={SOURCE_CODE}
      isOpen
      onOpenChange={() => {}}
      onClose={() => {}}
    />,
  );

  await waitFor(() => expect(screen.getByText("入賞デッキにだけある")).toBeTruthy(), {
    timeout: 3000,
  });
};

const tapCard = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name: `${name}のカード画像を表示する` }));

describe("DisplaySimilarDecksModal の差分カード", () => {
  it("入賞デッキにだけあるカードは、その入賞デッキの内訳から画像を出す", async () => {
    await openModal();

    tapCard("ロストスイーパー");

    const image = await waitFor(() => screen.getByAltText("ロストスイーパー"));

    expect(image.getAttribute("src")).toBe(`${IMAGE_BASE}/5.jpg`);
    expect(requested.some((url) => url.includes(`${WINNER_CODE}/detail`))).toBe(true);
  });

  it("検索元のデッキにだけあるカードは、検索元の内訳から画像を出す", async () => {
    await openModal();

    tapCard("ネストボール");

    const image = await waitFor(() => screen.getByAltText("ネストボール"));

    expect(image.getAttribute("src")).toBe(`${IMAGE_BASE}/3.jpg`);
    expect(requested.some((url) => url.includes(`${SOURCE_CODE}/detail`))).toBe(true);
  });

  /*
   * 差分カードの名前(バトラボのカードマスタ)と内訳の名前(deckcard-api)は出どころが違うので、
   * 突き合わせられないことがありうる。そのときは骨格のまま待たせず、見つからなかったと伝える
   */
  it("内訳に見当たらないカードは、見つからなかったことを伝える", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const url = String(input);

        if (url.includes("/similar")) return json(similarBody);
        if (url.includes("/detail")) return json(detailOf([]));

        return json({});
      }),
    );

    await openModal();

    tapCard("ロストスイーパー");

    await waitFor(() =>
      expect(
        screen.getByText("「ロストスイーパー」のカード画像が見つかりませんでした"),
      ).toBeTruthy(),
    );
  });
});
