import { describe, expect, it } from "vitest";

import { cityleagueHubPostText, cityleagueHubXIntentUrl } from "@app/utils/cityleagueHubShare";

const share = {
  path: "/cityleague_results/seasons/2027s1",
  title: "シティリーグ2027 シーズン1 の入賞デッキ一覧",
  utmCampaign: "cityleague_season",
};

describe("シティリーグ結果の一覧ページのシェア", () => {
  it("ポスト文はページのタイトルとハッシュタグ", () => {
    expect(cityleagueHubPostText(share.title)).toBe(
      "シティリーグ2027 シーズン1 の入賞デッキ一覧\n#バトレコ #ポケカ",
    );
  });

  it("X の intent に文言と、ページごとの utm_campaign を付けた URL を渡す", () => {
    const intent = new URL(cityleagueHubXIntentUrl(share, "https://vsrecorder.mobi"));
    expect(intent.origin + intent.pathname).toBe("https://x.com/intent/post");
    expect(intent.searchParams.get("text")).toBe(cityleagueHubPostText(share.title));

    const url = new URL(intent.searchParams.get("url")!);
    expect(url.origin + url.pathname).toBe("https://vsrecorder.mobi/cityleague_results/seasons/2027s1");
    expect(url.searchParams.get("utm_source")).toBe("x");
    expect(url.searchParams.get("utm_medium")).toBe("share");
    expect(url.searchParams.get("utm_campaign")).toBe("cityleague_season");
  });
});
