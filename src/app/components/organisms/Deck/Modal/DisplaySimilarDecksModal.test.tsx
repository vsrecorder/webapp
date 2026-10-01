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
  variantId: null,
  archetypeName: "ドラパルトex",
  variantName: null,
  label: "ドラパルトex",
  sprites: [],
};

// BFF(/api/deckcards/{code}/similar)が返す形。表示に要る項目だけ
const similarBody = (cards: {
  in: { name: string; count?: number | null; imageUrl: string | null }[];
  out: { name: string; count?: number | null; imageUrl: string | null }[];
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

  await waitFor(() => expect(screen.getByText("入賞デッキの方が多い")).toBeTruthy(), {
    timeout: 3000,
  });
};

const tapCard = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name: `${name}のカード画像を表示する` }));

// 画像は next/image の最適化 API(/_next/image?url=...)を通るので、元の URL は url= の中にある
const originalSrcOf = (image: HTMLElement) => {
  const src = image.getAttribute("src") ?? "";
  expect(src.startsWith("/_next/image?")).toBe(true);

  return decodeURIComponent(src).replace(/^\/_next\/image\?url=/, "").replace(/&w=.*$/, "");
};

describe("DisplaySimilarDecksModal の差分カード", () => {
  it("入賞デッキの方が多いカードは、その入賞デッキに入っている印刷の画像を出す", async () => {
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
    expect(originalSrcOf(image)).toBe(WINNER_PRINT);
  });

  it("自分のデッキの方が多いカードは、自分のデッキに入っている印刷の画像を出す", async () => {
    stubSimilar(
      similarBody({
        in: [{ name: "ロストスイーパー", imageUrl: WINNER_PRINT }],
        out: [{ name: "ネストボール", imageUrl: SOURCE_PRINT }],
      }),
    );
    await openModal();

    tapCard("ネストボール");

    const image = await waitFor(() => screen.getByAltText("ネストボール"));

    expect(originalSrcOf(image)).toBe(SOURCE_PRINT);
  });

  it("差分カードに枚数の差を「+カード名 ×2」の形で添える", async () => {
    stubSimilar(
      similarBody({
        in: [{ name: "ロストスイーパー", count: 2, imageUrl: WINNER_PRINT }],
        out: [{ name: "ネストボール", count: 1, imageUrl: SOURCE_PRINT }],
      }),
    );
    await openModal();

    expect(screen.getByText("あなたのデッキの方が多い")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "ロストスイーパーのカード画像を表示する" }).textContent,
    ).toBe("+ロストスイーパー ×2");
    expect(
      screen.getByRole("button", { name: "ネストボールのカード画像を表示する" }).textContent,
    ).toBe("−ネストボール ×1");
  });

  // 枚数を返す前の古い応答(キャッシュに残ったもの)は名前だけ
  it("枚数の差が無い応答では、カード名だけを出す", async () => {
    stubSimilar(
      similarBody({
        in: [{ name: "ロストスイーパー", imageUrl: WINNER_PRINT }],
        out: [],
      }),
    );
    await openModal();

    expect(
      screen.getByRole("button", { name: "ロストスイーパーのカード画像を表示する" }).textContent,
    ).toBe("+ロストスイーパー");
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

    expect(originalSrcOf(image)).toBe(REPRESENTATIVE);
  });

  // URL はあるが読めなかった(404 など)。骨格のまま待たせない
  it("画像を読めなかったときは、見つからなかったことを伝える", async () => {
    stubSimilar(
      similarBody({
        in: [{ name: "ロストスイーパー", imageUrl: WINNER_PRINT }],
        out: [],
      }),
    );
    await openModal();

    tapCard("ロストスイーパー");

    fireEvent.error(await waitFor(() => screen.getByAltText("ロストスイーパー")));

    await waitFor(() =>
      expect(
        screen.getByText("「ロストスイーパー」のカード画像が見つかりませんでした"),
      ).toBeTruthy(),
    );
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

  /*
   * 画像が届くのを少しだけ待ってから開く(PRE_DECODE_WAIT_MS)。届かなくても上限で開く
   * (開けなくなることはない)。「すぐ届けば待たない」の時間は jsdom の描画時間が混ざって
   * 測れないので、実ブラウザの画面キャプチャで確かめてある(温まった画像で骨格 0 フレーム)
   */
  it("開く前に画像のデコードを試み、届かなくても上限で開く", async () => {
    stubSimilar(
      similarBody({
        in: [{ name: "ロストスイーパー", imageUrl: WINNER_PRINT }],
        out: [{ name: "ネストボール", imageUrl: SOURCE_PRINT }],
      }),
    );
    await openModal();

    // jsdom の Image は読み込まない。decode の結末をテストから決められる形に差し替える。
    // コードは new window.Image() を使うので、vi.stubGlobal(globalThis)ではなく window 側を差し替える。
    // class で継承すると jsdom の Image は別の要素を返すので decode が付かない。関数で作って足す
    const RealImage = window.Image;
    let decodeResult: Promise<void> = Promise.resolve();
    const decodedSrcs: string[] = [];
    const FakeImage = function () {
      const img = new RealImage();
      img.decode = () => {
        decodedSrcs.push(decodeURIComponent(img.src));
        return decodeResult;
      };
      return img;
    } as unknown as typeof Image;
    window.Image = FakeImage;
    try {
      // すぐ届く
      tapCard("ロストスイーパー");
      await waitFor(() => screen.getByAltText("ロストスイーパー"));
      expect(decodedSrcs).toHaveLength(1);
      expect(decodedSrcs[0]).toContain(WINNER_PRINT);

      fireEvent.click(screen.getByAltText("ロストスイーパー"));
      await waitFor(() => expect(screen.queryByAltText("ロストスイーパー")).toBeNull());

      // 届かない: 上限(150ms)で開く
      decodeResult = new Promise(() => {});
      tapCard("ネストボール");
      await waitFor(() => screen.getByAltText("ネストボール"), { timeout: 1000 });
    } finally {
      window.Image = RealImage;
    }
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

    expect(originalSrcOf(image)).toBe(SOURCE_PRINT);
    expect(screen.queryByAltText("ロストスイーパー")).toBeNull();
  });
});

describe("DisplaySimilarDecksModal のバトラボへのリンク", () => {
  const linkHref = () =>
    screen
      .getByRole("link", { name: "この種類の採用カード・入賞デッキをバトラボで見る" })
      .getAttribute("href");

  it("型がある入賞デッキは、その型に絞った種類ページを開く", async () => {
    const body = similarBody({ in: [], out: [] });
    stubSimilar({
      ...body,
      similar: [
        {
          ...body.similar[0],
          archetype: { ...archetype, variantId: "blaziken", variantName: "バシャーモ型" },
        },
      ],
    });
    render(
      <DisplaySimilarDecksModal code={SOURCE_CODE} isOpen onOpenChange={() => {}} onClose={() => {}} />,
    );

    await waitFor(() => expect(linkHref()).toBeTruthy(), { timeout: 3000 });
    expect(linkHref()).toBe(
      "https://lab.vsrecorder.mobi/archetypes/dragapult?variant=blaziken&env=m6a",
    );
  });

  it("型が無ければ種類ページをそのまま開く", async () => {
    stubSimilar(similarBody({ in: [], out: [] }));
    render(
      <DisplaySimilarDecksModal code={SOURCE_CODE} isOpen onOpenChange={() => {}} onClose={() => {}} />,
    );

    await waitFor(() => expect(linkHref()).toBeTruthy(), { timeout: 3000 });
    expect(linkHref()).toBe("https://lab.vsrecorder.mobi/archetypes/dragapult?env=m6a");
  });
});
