// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DisplaySimilarDecksModal from "@app/components/organisms/Deck/Modal/DisplaySimilarDecksModal";

/*
 * 差分カードのタグをタップしたら、そのカードの画像が出ることの確認。
 *
 * 画像 URL はバトラボが差分カードに添えてくる(cards.in / cards.out。そのデッキに入っている
 * 印刷の画像)。それをそのまま出し、どこにも取りに行かない。添えられていないカードだけ
 * images(種類の代表画像)を控えにし、それも無ければ見つからなかったと伝える
 */

const SOURCE_CODE = "aaaaaa-bbbbbb-cccccc";
const WINNER_CODE = "dddddd-eeeeee-ffffff";
const IMAGE_BASE = "https://www.pokemon-card.com/assets/images/card_images/large";

// 入賞デッキの印刷・自分のデッキの印刷・カードマスタの代表画像は、どれも別の絵柄にしておく
const WINNER_PRINT = `${IMAGE_BASE}/MC/winner-lost-sweeper.jpg`;
const SOURCE_PRINT = `${IMAGE_BASE}/M-P/source-nest-ball.jpg`;
const REPRESENTATIVE = `${IMAGE_BASE}/SV6/representative.jpg`;

const archetype = {
  archetypeId: "dragapult",
  archetypeName: "ドラパルトex",
  variantName: null,
  label: "ドラパルトex",
  sprites: [],
};

// BFF(/api/deckcards/{code}/similar)が返す形。表示に要る項目だけ
const similarBody = (cards: {
  in: { name: string; imageUrl: string | null }[];
  out: { name: string; imageUrl: string | null }[];
}) => ({
  source: {
    deckCode: SOURCE_CODE,
    origin: "external",
    environmentId: "m6a",
    environmentTitle: "30th CELEBRATION",
    archetype,
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
      diffIn: cards.in.map((c) => c.name),
      diffOut: cards.out.map((c) => c.name),
      cards,
      archetype,
      sameArchetype: true,
      sameList: false,
    },
  ],
  candidates: 120,
  images: { ロストスイーパー: REPRESENTATIVE, ネストボール: REPRESENTATIVE },
});

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });

let requested: string[] = [];

const stubSimilar = (body: unknown) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      requested.push(String(input));

      return json(body);
    }),
  );
};

beforeEach(() => {
  requested = [];
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
  it("入賞デッキにだけあるカードは、その入賞デッキに入っている印刷の画像を出す", async () => {
    stubSimilar(
      similarBody({
        in: [{ name: "ロストスイーパー", imageUrl: WINNER_PRINT }],
        out: [{ name: "ネストボール", imageUrl: SOURCE_PRINT }],
      }),
    );
    await openModal();

    tapCard("ロストスイーパー");

    const image = await waitFor(() => screen.getByAltText("ロストスイーパー"));

    // 代表画像(images)ではなく、添えられた印刷の画像
    expect(image.getAttribute("src")).toBe(WINNER_PRINT);
  });

  it("自分のデッキにだけあるカードは、自分のデッキに入っている印刷の画像を出す", async () => {
    stubSimilar(
      similarBody({
        in: [{ name: "ロストスイーパー", imageUrl: WINNER_PRINT }],
        out: [{ name: "ネストボール", imageUrl: SOURCE_PRINT }],
      }),
    );
    await openModal();

    tapCard("ネストボール");

    const image = await waitFor(() => screen.getByAltText("ネストボール"));

    expect(image.getAttribute("src")).toBe(SOURCE_PRINT);
  });

  // 画像は応答に入っているので、タップしても何も取りに行かない(以前はデッキの内訳を引いていた)
  it("タップしても追加の取得をしない", async () => {
    stubSimilar(
      similarBody({
        in: [{ name: "ロストスイーパー", imageUrl: WINNER_PRINT }],
        out: [],
      }),
    );
    await openModal();
    const before = requested.length;

    tapCard("ロストスイーパー");
    await waitFor(() => screen.getByAltText("ロストスイーパー"));

    expect(requested.length).toBe(before);
    expect(requested.every((url) => url.includes("/similar"))).toBe(true);
  });

  // 印刷の画像が無いカード(索引に画像が無い・cards を返す前の古い応答)は代表画像で代える
  it("印刷の画像が無ければ、バトラボの代表画像を出す", async () => {
    stubSimilar(
      similarBody({
        in: [{ name: "ロストスイーパー", imageUrl: null }],
        out: [],
      }),
    );
    await openModal();

    tapCard("ロストスイーパー");

    const image = await waitFor(() => screen.getByAltText("ロストスイーパー"));

    expect(image.getAttribute("src")).toBe(REPRESENTATIVE);
  });

  it("印刷の画像も代表画像も無ければ、見つからなかったことを伝える", async () => {
    stubSimilar({
      ...similarBody({ in: [{ name: "ロストスイーパー", imageUrl: null }], out: [] }),
      images: {},
    });
    await openModal();

    tapCard("ロストスイーパー");

    await waitFor(() =>
      expect(
        screen.getByText("「ロストスイーパー」のカード画像が見つかりませんでした"),
      ).toBeTruthy(),
    );
  });

  it("別のカードを開いたとき、前のカードの画像を出したままにしない", async () => {
    stubSimilar(
      similarBody({
        in: [{ name: "ロストスイーパー", imageUrl: WINNER_PRINT }],
        out: [{ name: "ネストボール", imageUrl: SOURCE_PRINT }],
      }),
    );
    await openModal();

    tapCard("ロストスイーパー");
    await waitFor(() => expect(screen.getByAltText("ロストスイーパー")).toBeTruthy());

    // 画像をタップして閉じ、続けて別のカードを開く
    fireEvent.click(screen.getByAltText("ロストスイーパー"));
    tapCard("ネストボール");

    const image = await waitFor(() => screen.getByAltText("ネストボール"));

    expect(image.getAttribute("src")).toBe(SOURCE_PRINT);
    expect(screen.queryByAltText("ロストスイーパー")).toBeNull();
  });
});
