import { OfficialEventGetByIdResponseType } from "@app/types/official_event";
import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";
import { UnofficialEventGetByIdResponseType } from "@app/types/unofficial_event";
import { DeckGetByIdResponseType } from "@app/types/deck";
import { MatchGetResponseType } from "@app/types/match";

export type PostTextOptions = {
  // 対戦結果をポスト文に含めるか(既定: true)
  includeMatches?: boolean;
  // 使用デッキをポスト文に含めるか(既定: true)
  includeDeck?: boolean;
  // 公式イベントの会場(店舗名)をポスト文に含めるか(既定: true)
  includeVenue?: boolean;
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
 * イベントは公式 / Tonamel / 自由形式のいずれか。自由形式でも対戦結果は含める。
 */
export function buildRecordPostText(
  eventDateLabel: string,
  officialEvent: OfficialEventGetByIdResponseType | null,
  tonamelEvent: TonamelEventGetByIdResponseType | null,
  unofficialEvent: UnofficialEventGetByIdResponseType | null,
  deck: DeckGetByIdResponseType | null,
  matches: MatchGetResponseType[] | null,
  opts?: PostTextOptions,
): string {
  const includeMatches = opts?.includeMatches ?? true;
  const includeDeck = opts?.includeDeck ?? true;
  const includeVenue = opts?.includeVenue ?? true;

  let results = "";
  if (includeMatches && matches && matches.length !== 0) {
    results = "\n対戦結果\n";
    // チーム戦を含む場合は「チ(チーム)/個(個人)」の勝敗を並べて表示するためのヘッダーを付ける
    const hasGroupMatch = matches.some((match) => match.group_match_flg);
    if (hasGroupMatch) {
      results += " チ個\n";
    }
    matches.forEach((match) => {
      // 勝敗マーク。チーム戦はチーム・個人の2つ、それ以外は個人のみを表示する
      const victory = match.group_match_flg
        ? `${match.group_match_victory_flg ? "⭕" : "❌"}${
            match.victory_flg ? "⭕" : "❌"
          }`
        : match.victory_flg
          ? "⭕"
          : "❌";
      const go_first =
        match.default_victory_flg || match.default_defeat_flg
          ? "　"
          : match.games[0].go_first
            ? "先"
            : "後";
      // チーム戦でも相手のデッキ情報を表示する
      const opponents_deck_info = match.default_victory_flg
        ? "不戦勝"
        : match.default_defeat_flg
          ? "不戦敗"
          : match.opponents_deck_info;
      results += `${victory} ${go_first} ${opponents_deck_info}\n`;
    });
  }

  let text = eventDateLabel ? `${eventDateLabel}\n` : "";

  // イベント名。自由形式イベントはタイトルのみを持つ。
  let hasEventLine = true;
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
    // 会場(店舗名)は伏せられるようにする。伏せる場合はイベント名だけを載せる。
    const shopName = includeVenue ? officialEvent.shop_name || officialEvent.venue : "";
    text += shopName ? `${title}\n${shopName}\n` : `${title}\n`;
  } else if (tonamelEvent) {
    text += `${tonamelEvent.title}\n`;
  } else if (unofficialEvent && unofficialEvent.title !== "") {
    text += `${unofficialEvent.title}\n`;
  } else {
    hasEventLine = false;
  }

  // 対戦結果はイベントの有無・種別によらず常に連結する。
  // (以前はイベント名の分岐の中でしか連結しておらず、イベントが取得できない記録
  //  ＝自由形式イベントの記録では対戦結果がポスト文から丸ごと抜け落ちていた)
  if (results !== "" || hasEventLine) {
    text += `${results}\n`;
  }

  if (includeDeck && deck && deck.name !== "") {
    text += `使用デッキ：${deck.name}\n`;
  }

  // 末尾の余分な改行を除去し、この後に付くハッシュタグとの間を1行にする
  return text.trimEnd();
}
