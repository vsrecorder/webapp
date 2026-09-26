import { describe, expect, it } from "vitest";

import { splitAtBreakPoints } from "@app/utils/titleBreak";

describe("splitAtBreakPoints", () => {
  it("「/」の後ろで区切り、「/」は前の部分に付ける", () => {
    expect(splitAtBreakPoints("ワイルドフォース/サイバージャッジ")).toEqual([
      { text: "ワイルドフォース/" },
      { text: "サイバージャッジ" },
    ]);
    expect(splitAtBreakPoints("古代の咆哮／未来の一閃")).toEqual([
      { text: "古代の咆哮／" },
      { text: "未来の一閃" },
    ]);
  });

  // 空白をまとまりの内側に入れると、そこで改行できず1行からはみ出す
  it("空白は部分の外に文字列として置く", () => {
    expect(splitAtBreakPoints("スタートデッキ100 バトルコレクション")).toEqual([
      { text: "スタートデッキ100" },
      " ",
      { text: "バトルコレクション" },
    ]);
  });

  it("区切りの無い名前は1つの部分", () => {
    expect(splitAtBreakPoints("ニンジャスピナー")).toEqual([{ text: "ニンジャスピナー" }]);
  });

  it("つなぎ直すと元の文字列になる", () => {
    for (const title of [
      "スカーレットex/バイオレットex",
      "30th CELEBRATION",
      "スタートデッキ100 バトルコレクション",
    ]) {
      const joined = splitAtBreakPoints(title)
        .map((segment) => (typeof segment === "string" ? segment : segment.text))
        .join("");
      expect(joined).toBe(title);
    }
  });
});
