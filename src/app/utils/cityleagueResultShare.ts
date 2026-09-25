import { OfficialEventType } from "@app/types/official_event";
import { formatJSTDate } from "@app/utils/date";

// シティリーグ結果の個別ページをシェアするための URL と文言。

// シェアの文言に使うイベントの項目
export type CityleagueResultShareEvent = Pick<
  OfficialEventType,
  "id" | "title" | "shop_name" | "prefecture_name" | "date"
>;

export function cityleagueResultPath(eventId: number): string {
  return `/cityleague_results/${eventId}`;
}

// X のポスト文(URL は intent の url に別で渡す)
export function cityleagueResultPostText(event: CityleagueResultShareEvent): string {
  return [
    `${event.title} ${event.shop_name}（${event.prefecture_name}）${formatJSTDate(event.date)}の結果`,
    "#バトレコ #ポケカ",
  ].join("\n");
}

// X の投稿画面を開く URL。既存のシェアと同じく utm を付け、流入を追えるようにする
export function cityleagueResultXIntentUrl(
  event: CityleagueResultShareEvent,
  origin: string,
): string {
  const url = new URL(cityleagueResultPath(event.id), origin);
  url.searchParams.set("utm_source", "x");
  url.searchParams.set("utm_medium", "share");
  url.searchParams.set("utm_campaign", "cityleague_result");

  const intent = new URL("https://x.com/intent/post");
  intent.searchParams.set("text", cityleagueResultPostText(event));
  intent.searchParams.set("url", url.toString());

  return intent.toString();
}
