import { OfficialEventGetByIdResponseType } from "@app/types/official_event";
import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";
import { DeckGetByIdResponseType } from "@app/types/deck";
import { MatchGetResponseType } from "@app/types/match";

export type PostTextOptions = {
  // 対戦結果をポスト文に含めるか(既定: true)
  includeMatches?: boolean;
  // 使用デッキをポスト文に含めるか(既定: true)
  includeDeck?: boolean;
};

// 記録の開催日ラベル("2025年6月15日(日)")。event_date が未設定(ゼロ値)なら作成日を使う。
export function formatEventDateLabel(
  eventDate: string,
  createdAt: string | Date,
): string {
  const dateStr =
    eventDate && !eventDate.startsWith("0001-01-01")
      ? eventDate
      : createdAt.toString();
  return new Date(dateStr).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

/*
 * 共有・ツイートで使うポスト文本文を組み立てる(ハッシュタグ・via は含めない)。
 * 先頭に開催日を置き、対戦結果・使用デッキの有無は opts で切り替えられる。
 * 勝敗はチーム戦のときチームの勝敗、それ以外は個人の勝敗を採用する。
 */
export function buildRecordPostText(
  eventDateLabel: string,
  officialEvent: OfficialEventGetByIdResponseType | null,
  tonamelEvent: TonamelEventGetByIdResponseType | null,
  deck: DeckGetByIdResponseType | null,
  matches: MatchGetResponseType[] | null,
  opts?: PostTextOptions,
): string {
  const includeMatches = opts?.includeMatches ?? true;
  const includeDeck = opts?.includeDeck ?? true;

  let results = "";
  if (includeMatches && matches && matches.length !== 0) {
    results = "\n対戦結果\n";
    matches.forEach((match) => {
      const won = match.group_match_flg
        ? match.group_match_victory_flg
        : match.victory_flg;
      const victory = won ? "⭕" : "❌";
      const go_first =
        match.default_victory_flg || match.default_defeat_flg
          ? "　"
          : match.games[0].go_first
            ? "先"
            : "後";
      // チーム戦は相手個人のデッキではなく「チーム戦」と表記する
      const opponents_deck_info = match.default_victory_flg
        ? "不戦勝"
        : match.default_defeat_flg
          ? "不戦敗"
          : match.group_match_flg
            ? "チーム戦"
            : match.opponents_deck_info;
      results += ` ${victory} ${go_first} ${opponents_deck_info}\n`;
    });
  }

  let text = eventDateLabel ? `${eventDateLabel}\n` : "";
  if (officialEvent) {
    const title = officialEvent.title
      .replace(/【.*?】ポケモンカードジム　/g, "")
      .replace(/【.*?】エクストラバトルの日/g, "エクストラバトルの日")
      .replace(/【.*?】ポケモンカードゲーム　/g, "")
      .replace(/ポケモンカードゲーム /g, "")
      .replace(/（オープンリーグ）/g, "")
      .replace(/（マスターリーグ）/g, "")
      .replace(/（シニアリーグ）/g, "")
      .replace(/（ジュニアリーグ）/g, "")
      .replace(/（スタンダード）/g, "")
      .replace(/（.*?）/g, "");
    const shopName = officialEvent.shop_name || officialEvent.venue;
    text += `${title}\n${shopName}\n${results}\n`;
  } else if (tonamelEvent) {
    text += `${tonamelEvent.title}\n${results}\n`;
  }

  if (includeDeck && deck && deck.name !== "") {
    text += `使用デッキ：${deck.name}\n`;
  }

  // 末尾の余分な改行を除去し、この後に付くハッシュタグとの間を1行にする
  return text.trimEnd();
}
