import { describe, expect, it } from "vitest";

import {
  CityleagueResultShareEvent,
  cityleagueResultPath,
  cityleagueResultPostText,
  cityleagueResultXIntentUrl,
} from "@app/utils/cityleagueResultShare";

const event: CityleagueResultShareEvent = {
  id: 953108,
  title: "シティリーグ シーズン2",
  shop_name: "カードショップ東京",
  prefecture_name: "東京都",
  date: new Date("2026-09-20T00:00:00+09:00"),
};

describe("シティリーグ結果のシェア", () => {
  it("個別ページの URL", () => {
    expect(cityleagueResultPath(953108)).toBe("/cityleague_results/953108");
  });

  it("ポスト文は大会・店舗・都道府県・開催日を載せる", () => {
    expect(cityleagueResultPostText(event)).toBe(
      "シティリーグ シーズン2 カードショップ東京（東京都）2026年9月20日の結果\n#バトレコ #ポケカ",
    );
  });

  it("X の intent に文言と utm 付きの URL を渡す", () => {
    const intent = new URL(cityleagueResultXIntentUrl(event, "https://vsrecorder.mobi"));
    expect(intent.origin + intent.pathname).toBe("https://x.com/intent/post");
    expect(intent.searchParams.get("text")).toBe(cityleagueResultPostText(event));

    const url = new URL(intent.searchParams.get("url")!);
    expect(url.origin + url.pathname).toBe("https://vsrecorder.mobi/cityleague_results/953108");
    expect(url.searchParams.get("utm_source")).toBe("x");
    expect(url.searchParams.get("utm_medium")).toBe("share");
    expect(url.searchParams.get("utm_campaign")).toBe("cityleague_result");
  });
});
