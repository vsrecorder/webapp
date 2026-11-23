import { describe, expect, it } from "vitest";

import {
  keepNamesUnbroken,
  splitAfterBracketLabels,
  splitAtBreakPoints,
} from "@app/utils/titleBreak";

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

describe("keepNamesUnbroken", () => {
  it("名前の中の空白だけを NBSP にする(名前の後ろの空白では改行できる)", () => {
    expect(keepNamesUnbroken("30th CELEBRATION スペシャルメダルグランプリ")).toBe(
      "30th\u00A0CELEBRATION スペシャルメダルグランプリ",
    );
  });

  // 区分名の直後の空白だけを NBSP にする(その前の空白では改行できる)
  it.each([
    ["チャンピオンズリーグ2027 横浜 マスターリーグ 本戦", "マスターリーグ 本戦"],
    ["チャンピオンズリーグ2027 横浜 マスターリーグ 1日目予選", "マスターリーグ 1日目予選"],
    ["チャンピオンズリーグ2027 横浜 シニアリーグ 1日目大会", "シニアリーグ 1日目大会"],
    ["チャンピオンズリーグ2027 横浜 ジュニアリーグ 2日目大会", "ジュニアリーグ 2日目大会"],
    [
      "チャンピオンズリーグ2027 横浜 ジュニアリーグ 1日目大会or2日目大会どちらでも可",
      "ジュニアリーグ 1日目大会or2日目大会どちらでも可",
    ],
    ["ポケモンジャパンチャンピオンシップス2026 シニアリーグ Day2", "シニアリーグ Day2"],
  ])("「〈区分〉リーグ 〈日程〉」をまとめる: %s", (title, unbroken) => {
    const prefix = title.slice(0, title.length - unbroken.length);

    expect(keepNamesUnbroken(title)).toBe(prefix + unbroken);
  });

  // 「予選 グループA」のように日程の後ろにも語が続くときは、区分名と次の語だけをまとめる
  it("区分名に続く 1 語だけをまとめ、その後ろの空白では改行できる", () => {
    expect(keepNamesUnbroken("「秋田市～えす2025」オープンリーグ 予選 グループA")).toBe(
      "「秋田市～えす2025」オープンリーグ 予選 グループA",
    );
  });

  // 区分の付かない「〜リーグ」(シティリーグ・トレーナーズリーグ)は対象外
  it.each(["シティリーグ シーズン1 東京", "トレーナーズリーグ スタンダード"])(
    "区分名でない「リーグ」は変えない: %s",
    (title) => {
      expect(keepNamesUnbroken(title)).toBe(title);
    },
  );

  it("対象の名前を含まないイベント名は変えない", () => {
    const title = "ジムバトル スペシャル";

    expect(keepNamesUnbroken(title)).toBe(title);
  });
});

describe("splitAfterBracketLabels", () => {
  it("【】の後ろで行を分ける", () => {
    expect(splitAfterBracketLabels("【26/9】ポケモンカードジム　ジムバトル")).toEqual([
      "【26/9】",
      "ポケモンカードジム　ジムバトル",
    ]);
  });

  it("】の直後の空白は行頭に残さない", () => {
    expect(splitAfterBracketLabels("【初心者歓迎】　ジムバトル")).toEqual(["【初心者歓迎】", "ジムバトル"]);
  });

  it("途中や複数の【】でも、それぞれの後ろで分ける", () => {
    expect(splitAfterBracketLabels("ジムバトル【S1】【決勝】トーナメント")).toEqual([
      "ジムバトル【S1】",
      "【決勝】",
      "トーナメント",
    ]);
  });

  it("末尾の【】や【】の無い名前は分けない", () => {
    expect(splitAfterBracketLabels("ジムバトル【S1】")).toEqual(["ジムバトル【S1】"]);
    expect(splitAfterBracketLabels("ジムバトル")).toEqual(["ジムバトル"]);
  });
});
