import { describe, expect, it } from "vitest";

import { cardImageProps } from "@app/utils/cardImage";

const SRC = "https://www.pokemon-card.com/assets/images/card_images/large/MC/049440_T_BOSUNOSHIREI.jpg";

// srcset の候補の幅を取り出す(/_next/image?url=...&w=96&q=75 の w)
const widthsOf = (srcSet: string | undefined) =>
  (srcSet ?? "").split(",").map((c) => Number(/[?&]w=(\d+)/.exec(c)?.[1]));

describe("cardImageProps", () => {
  it("最適化 API を通した同一オリジンの URL にする", () => {
    const props = cardImageProps(SRC, "ボスの指令", "thumbnail");

    expect(props.src.startsWith("/_next/image?")).toBe(true);
    expect(decodeURIComponent(props.src)).toContain(SRC);
    expect(props.alt).toBe("ボスの指令");
    expect(props.loading).toBe("lazy");
  });

  // 表示の大きさに合わせた 2 候補。公式サイトの 868px をそのまま読まない
  it("サムネイルは 96 と 256、モーダルは 384 と 828 の候補になる", () => {
    expect(widthsOf(cardImageProps(SRC, "", "thumbnail").srcSet)).toEqual([96, 256]);
    expect(widthsOf(cardImageProps(SRC, "", "modal").srcSet)).toEqual([384, 828]);
  });

  it("モーダルは開いた瞬間に読み始める(eager)", () => {
    expect(cardImageProps(SRC, "", "modal", "eager").loading).toBe("eager");
  });
});
