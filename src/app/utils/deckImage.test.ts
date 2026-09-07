import { describe, expect, it } from "vitest";

import { CDN_ORIGIN } from "@app/utils/cdn";
import { deckImageUrl } from "@app/utils/deckImage";

describe("deckImageUrl", () => {
  it("デッキコードから CDN のデッキ画像URLを組み立てる", () => {
    expect(deckImageUrl("FkVdfF-xyOrPQ-FvbvdF")).toBe(
      `${CDN_ORIGIN}/images/decks/FkVdfF-xyOrPQ-FvbvdF.jpg`,
    );
  });

  /*
   * 各画面に散らばっていたハードコードをこの関数へ寄せた。文字列を組み立て直した結果、
   * 出来上がるURLが以前と1文字でも変われば画像が出なくなるため、実際に配信されている
   * 形をそのまま置いて固定する。
   */
  it("配信されている形と完全に一致する", () => {
    expect(deckImageUrl("FkVdfF-xyOrPQ-FvbvdF")).toBe(
      "https://xx8nnpgt.user.webaccel.jp/images/decks/FkVdfF-xyOrPQ-FvbvdF.jpg",
    );
  });
});
