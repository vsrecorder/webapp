import { OfficialEventGetByIdResponseType } from "@app/types/official_event";

const ICON_BASE = "https://xx8nnpgt.user.webaccel.jp/images/icons/";

// 公式イベントのタイトルから店舗名接頭辞・リーグ種別の注記などの冗長な部分を取り除く。
// 一覧カード(OfficialEventRecord)とカレンダー機能で共有する。
export function cleanOfficialEventTitle(title: string): string {
  return title
    .replace(/【.*?】ポケモンカードジム　/g, "")
    .replace(/【.*?】ポケモンカードジム /g, "")
    .replace(/【.*?】ポケモンカードジム  /g, "")
    .replace(/【.*?】ポケモンカードジム   /g, "")
    .replace(/【.*?】エクストラバトルの日/g, "エクストラバトルの日")
    .replace(/【.*?】ポケモンカードゲーム　/g, "")
    .replace(/ポケモンカードゲーム /g, "")
    .replace(/（オープンリーグ）/g, "")
    .replace(/（マスターリーグ）/g, "")
    .replace(/（シニアリーグ）/g, "")
    .replace(/（ジュニアリーグ）/g, "")
    .replace(/（スタンダード）/g, "")
    .replace(/（.*?）/g, "");
}

/*
 * 公式イベントの種別アイコン/アクセント色/チップ表記を判定するヘルパー。
 * 一覧カード(OfficialEventRecord)と詳細カード(OfficialEventInfo)で共有する。
 */
export function getEventIconUrl(officialEvent: OfficialEventGetByIdResponseType): string {
  if (officialEvent.type_id === 1) {
    if (officialEvent.title.includes("ポケモンジャパンチャンピオンシップス")) {
      return `${ICON_BASE}jcs.png`;
    }
    if (officialEvent.title.includes("チャンピオンズリーグ")) {
      return `${ICON_BASE}cl.png`;
    }
    if (officialEvent.title.includes("スクランブルバトル")) {
      return `${ICON_BASE}sb.png`;
    }
    return `${ICON_BASE}pokemon_card_game.png`;
  }
  if (officialEvent.type_id === 2) {
    return `${ICON_BASE}city.png`;
  }
  if (officialEvent.type_id === 3) {
    return `${ICON_BASE}trainers.png`;
  }
  if (officialEvent.type_id === 4) {
    if (officialEvent.title.includes("ジムバトル")) {
      return `${ICON_BASE}gym.png`;
    }
    if (officialEvent.title.includes("MEGAウインターリーグ")) {
      return `${ICON_BASE}mega_winter_league.png`;
    }
    if (officialEvent.title.includes("スタートデッキ100　そのままバトル")) {
      return `${ICON_BASE}100_sonomama_battle.png`;
    }
    if (officialEvent.title.includes("マイジムNo.1決定戦")) {
      return `${ICON_BASE}mygym_no1.png`;
    }
    return `${ICON_BASE}pokemon_card_game.png`;
  }
  if (officialEvent.type_id === 6) {
    return `${ICON_BASE}organizer.png`;
  }
  if (officialEvent.type_id === 7) {
    if (officialEvent.title.includes("ポケモンカードゲーム教室")) {
      return `${ICON_BASE}classroom.png`;
    }
    if (officialEvent.title.includes("ビクティニBWR争奪戦")) {
      return `${ICON_BASE}victini_bwr.png`;
    }
    if (officialEvent.title.includes("スタートデッキ100　そのままバトル")) {
      return `${ICON_BASE}100_sonomama_battle.png`;
    }
    if (
      officialEvent.title.includes(
        "100人大集合でたとこバトル ～スタートデッキ100 バトルコレクション～",
      )
    ) {
      return `${ICON_BASE}100_detatoko_battle.png`;
    }
    return `${ICON_BASE}pokemon_card_game.png`;
  }
  return `${ICON_BASE}pokemon_card_game.png`;
}

export function getEventAccentColor(
  officialEvent: OfficialEventGetByIdResponseType,
): string {
  if (officialEvent.type_id === 1) return "bg-yellow-400";
  if (officialEvent.type_id === 2) return "bg-purple-500";
  if (officialEvent.type_id === 3) return "bg-blue-300";
  if (officialEvent.type_id === 4) {
    if (officialEvent.title.includes("ジムバトル")) return "bg-green-500";
    return "bg-teal-500";
  }
  if (officialEvent.type_id === 6) return "bg-slate-400";
  if (officialEvent.type_id === 7) return "bg-pink-400";
  return "bg-default-300";
}

export type ChipColor =
  "default" | "primary" | "secondary" | "success" | "warning" | "danger";

export function getChipColor(officialEvent: OfficialEventGetByIdResponseType): ChipColor {
  if (officialEvent.type_id === 1) return "warning";
  if (officialEvent.type_id === 2) return "secondary";
  if (officialEvent.type_id === 3) return "primary";
  if (officialEvent.type_id === 4) {
    if (officialEvent.title.includes("ジムバトル")) return "success";
    return "default";
  }
  return "default";
}

// 主催店舗名(会場)の表示ラベル。shop_name を優先し、無ければ venue を使う。
// 記録カード各所(TweetButton等)と同じフォールバック規約。
export function getEventVenueLabel(
  officialEvent: OfficialEventGetByIdResponseType,
): string {
  return officialEvent.shop_name?.trim() || officialEvent.venue?.trim() || "";
}

export function getEventTypeName(
  officialEvent: OfficialEventGetByIdResponseType,
): string {
  if (officialEvent.type_id === 1) {
    if (officialEvent.title.includes("ポケモンジャパンチャンピオンシップス"))
      return "PJCS";
    if (officialEvent.title.includes("チャンピオンズリーグ"))
      return "チャンピオンズリーグ";
    if (officialEvent.title.includes("スクランブルバトル")) return "スクランブルバトル";
    return "大型大会";
  }
  if (officialEvent.type_id === 2) return "シティリーグ";
  if (officialEvent.type_id === 3) return "トレーナーズリーグ";
  if (officialEvent.type_id === 4) {
    if (officialEvent.title.includes("ジムバトル")) return "ジムバトル";
    if (officialEvent.title.includes("MEGAウインターリーグ"))
      return "MEGAウインターリーグ";
    return "その他";
  }
  if (officialEvent.type_id === 6) return "公認自主";
  return "その他";
}
