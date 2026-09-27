import { CITYLEAGUE_POST_HASHTAGS } from "@app/utils/cityleagueResultShare";

// シティリーグ結果の一覧ページ(開催日・開催月・シーズン・環境ごとの入賞デッキ一覧)をシェアするための文言と URL。
// 大会の個別ページのシェア(cityleagueResultShare.ts)と同じ形にそろえる。

export type CityleagueHubShare = {
  // ページのパス(例 "/cityleague_results/dates/2026-09-26")
  path: string;
  // ページのタイトル(例「2026年9月26日(土)のシティリーグ入賞デッキ一覧」。<title> と同じもの)
  title: string;
  // 流入を分けて追うための utm_campaign(例 "cityleague_date")
  utmCampaign: string;
};

// X のポスト文(URL は intent の url に別で渡す)
export function cityleagueHubPostText(title: string): string {
  return [title, CITYLEAGUE_POST_HASHTAGS].join("\n");
}

// X の投稿画面を開く URL。個別ページのシェアと同じく utm を付け、流入を追えるようにする
export function cityleagueHubXIntentUrl(share: CityleagueHubShare, origin: string): string {
  const url = new URL(share.path, origin);
  url.searchParams.set("utm_source", "x");
  url.searchParams.set("utm_medium", "share");
  url.searchParams.set("utm_campaign", share.utmCampaign);

  const intent = new URL("https://x.com/intent/post");
  intent.searchParams.set("text", cityleagueHubPostText(share.title));
  intent.searchParams.set("url", url.toString());

  return intent.toString();
}
