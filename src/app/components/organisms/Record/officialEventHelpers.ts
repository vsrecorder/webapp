import { OfficialEventType } from "@app/types/official_event";
import { DEFAULT_REGULATION_ID, REGULATION_ID_EXTRA } from "@app/types/regulation";

/*
 * 判定に使うフィールドだけを要求する。
 *
 * 単品応答(OfficialEventGetByIdResponseType)を丸ごと要求すると、BFF が表示に使う
 * ぶんだけへ絞っている一覧の要素(OfficialEventListItemType)を渡せない。実際に見るのは
 * 種別とタイトル(会場ラベルだけ店舗名と会場名)なので、そこまで緩める。
 */
type OfficialEventKind = Pick<OfficialEventType, "title" | "type_id">;
type OfficialEventTitle = Pick<OfficialEventType, "title">;
type OfficialEventVenue = Pick<OfficialEventType, "shop_name" | "venue">;

const ICON_BASE = "https://xx8nnpgt.user.webaccel.jp/images/icons/";

// 公式イベントのタイトルから店舗名接頭辞・リーグ種別の注記などの冗長な部分を取り除く。
// 一覧カード・戦績カード・詳細カード・カレンダー・シェア文で共有する整形処理。
export function cleanOfficialEventTitle(title: string): string {
  const cleaned = title
    .replace(/【.*?】ポケモンカードジム\s*/g, "")
    .replace(/【.*?】エクストラバトルの日/g, "エクストラバトルの日")
    // 「【10_11月開催】30th CELEBRATION スペシャルメダルグランプリ」の開催時期の注記
    .replace(/【.*?】(?=30th CELEBRATION スペシャルメダルグランプリ)/g, "")
    .replace(/【.*?】ポケモンカードゲーム　/g, "")
    .replace(/ポケモンカードゲーム /g, "")
    .replace(/カードゲーム部門/g, "")
    .replace(/（オープンリーグ）/g, "")
    .replace(/（マスターリーグ）/g, "")
    .replace(/（シニアリーグ）/g, "")
    .replace(/（ジュニアリーグ）/g, "")
    .replace(/（スタンダード）/g, "");

  // スクランブルバトルの括弧は「（ソロバトル）」「（トリオバトル）」のように
  // 同じ会場で並行開催される種目を表すため、消すと別イベントが同名になってしまう。
  // リーグ・レギュレーションの注記は上で除去済みなので、残りはそのまま残す。
  if (cleaned.includes("スクランブルバトル")) return cleaned.trim();

  return cleaned.replace(/（.*?）/g, "").trim();
}

/*
 * リーグ区分(official_events.league_title)のうち、イベント情報に表示するもの。
 *
 * ジムバトルなど区分の無いイベントは「その他」が入るので出さない。
 * 区分が分かれるのはトレーナーズリーグ・チャンピオンズリーグ・教室などで、
 * タイトルの「（オープンリーグ）」は cleanOfficialEventTitle が消すため、ここで補う。
 */
const DISPLAY_LEAGUES = ["オープン", "マスター", "シニア", "ジュニア"] as const;

export function getEventLeagueLabel(leagueTitle: string | null | undefined): string {
  const league = leagueTitle?.trim() ?? "";
  return (DISPLAY_LEAGUES as readonly string[]).includes(league) ? league : "";
}

/*
 * 公式イベントの選択欄に並べる順。種別(type_id) → ジムバトル → リーグ区分 → リーグ(league_id) の昇順。
 *
 * 種別 4 の中ではジムバトル(「ジムバトル／小学生以下」も含む)を先頭に置き、
 * トレーナーズリーグ(種別 3)のすぐ下に来るようにする。種別 4 にはポケモンセンターの
 * フリーバトル・教室・スペシャルメダルグランプリなども入っていて、どれも区分が「その他」で
 * league_id がジムバトル(2026 は 1411)より小さいため、そのままだとジムバトルが後ろへ回る。
 * league_id はシーズンごとに変わるので、判定はタイトルで行う(isGymBattle)。
 *
 * リーグ区分は オープン → マスター → シニア → ジュニア(DISPLAY_LEAGUES の並び)。
 * league_id の昇順だと、トレーナーズリーグ2026 は オープン=1410・ジュニア=1413・
 * シニア=1414・マスター=1417 なので オープン → ジュニア → シニア → マスター になってしまう。
 * 区分の無いもの(ジムバトルの「その他」など)は同じ種別の末尾に置く。
 * 同じ区分の中は league_id で分け、同じ大会シリーズ同士をまとめる。
 *
 * 一覧APIは開催時刻の昇順で返す。シティリーグ結果のページなど他の利用者はその順を
 * 前提にしているので、API の並びは変えずに選択欄の候補だけここで並べ替える。
 * Array.prototype.sort は安定ソートなので、種別・リーグが同じものは開催時刻の順のまま残る。
 *
 * league_id が無い(0 / 未設定)ものは同じ種別・区分の末尾に置く。API が league_id を返す
 * 前の版でも並びが崩れないようにするため(そのときは種別と区分だけで並ぶ)。
 *
 * 引数の配列は SWR のキャッシュなので書き換えず、並べ替えた新しい配列を返す。
 */
type OfficialEventSortKey = {
  type_id: number;
  title: string;
  league_title?: string | null;
  league_id?: number | null;
};

export function sortOfficialEventsForSelect<T extends OfficialEventSortKey>(
  events: readonly T[],
): T[] {
  // 表示しない区分(空文字)は indexOf が -1 になるので、末尾へ回す
  const leagueRank = (event: T) => {
    const rank = (DISPLAY_LEAGUES as readonly string[]).indexOf(
      getEventLeagueLabel(event.league_title),
    );
    return rank === -1 ? DISPLAY_LEAGUES.length : rank;
  };
  const leagueKey = (event: T) => event.league_id || Number.MAX_SAFE_INTEGER;
  const gymBattleKey = (event: T) => (isGymBattle(event) ? 0 : 1);

  return [...events].sort(
    (a, b) =>
      a.type_id - b.type_id ||
      gymBattleKey(a) - gymBattleKey(b) ||
      leagueRank(a) - leagueRank(b) ||
      leagueKey(a) - leagueKey(b),
  );
}

// ジムバトルかどうか。種別 4(ジムイベント)のうちタイトルに「ジムバトル」を含むもの。
// 「ジムバトル／小学生以下」も含む。アイコン・アクセント色の判定(getEventIconUrl など)と同じ条件。
function isGymBattle(officialEvent: OfficialEventKind): boolean {
  return officialEvent.type_id === 4 && officialEvent.title.includes("ジムバトル");
}

// PJCS(ポケモンジャパンチャンピオンシップス)かどうかを判定する。
// タイトルは整形後もフルネーム(ポケモンジャパンチャンピオンシップス)を保持するが、
// 過去データ等で「PJCS」表記のものも判定できるよう両方を見る。
export function isPJCS(officialEvent: OfficialEventKind): boolean {
  return (
    officialEvent.title.includes("ポケモンジャパンチャンピオンシップス") ||
    officialEvent.title.includes("PJCS")
  );
}

/*
 * ジャッジの募集・稼働・研修・セミナーのような、対戦の記録を付ける対象ではない公式イベントか。
 * 記録作成のイベント選択(OfficialEventSelect)と自由形式の誘導判定から外すのに使う。
 *
 * これらは公式サイト上で「大型大会」(type_id: 1)として登録されているため、大型大会のうち
 * タイトルに「ジャッジ」を含むものを外す(例:「チャンピオンズリーグ2027千葉　ジャッジ稼働」
 * 「ジャッジセミナーinスクランブルバトル大阪【初級編】」)。
 * 他の種別は外さない。オーガナイザーイベント(type_id: 6)の「ジャッジとバトル！」などは
 * 実際に対戦するイベントで、ジャッジを含む名前でも記録を付ける対象になる。
 *
 * 判定は整形前のタイトルで行うこと。cleanOfficialEventTitle は括弧書きを消すため、
 * 「スクランブルバトル 大阪（ジャッジ応募）」のような注記が落ちることがある。
 */
export function isJudgeStaffEvent(officialEvent: OfficialEventKind): boolean {
  return officialEvent.type_id === 1 && officialEvent.title.includes("ジャッジ");
}

// エクストラバトルの日かどうかを判定する。
// 判定は整形前後どちらのタイトルでも効く(cleanOfficialEventTitle が落とすのは
// 店舗名の【】接頭辞だけで、「エクストラバトルの日」はそのまま残る)。
function isExtraBattleDay(officialEvent: OfficialEventTitle): boolean {
  return officialEvent.title.includes("エクストラバトルの日");
}

/*
 * 選んだ公式イベントに対する、記録のレギュレーションの既定値。
 *
 * エクストラバトルの日はエクストラレギュレーションで行われるイベントなので、
 * 選んだ時点で「エクストラ」にしておく(既定のスタンダードのまま記録されると、
 * 戦績・デッキ使用率がレギュレーション違いで混ざる)。
 * それ以外のイベントと未選択は既定値(スタンダード)。
 *
 * あくまで既定値なので、利用者が自分で選び直したあとは呼び出し側が上書きしないこと。
 */
export function defaultRegulationIdForOfficialEvent(
  officialEvent: OfficialEventTitle | null,
): number {
  if (officialEvent && isExtraBattleDay(officialEvent)) return REGULATION_ID_EXTRA;

  return DEFAULT_REGULATION_ID;
}

/*
 * 記録作成フォームのレギュレーションの既定値。
 *
 * 公式イベントのタブ以外では、選んだイベントはその記録に紐づかない(自由形式・Tonamel の
 * 記録になる)。イベント由来の既定値をそのまま持ち越すと、エクストラバトルの日を一度
 * 選んだだけで自由形式の記録までエクストラで登録され、戦績・デッキ使用率が
 * レギュレーション違いで混ざる。タブを離れたら既定値(スタンダード)へ戻す。
 *
 * あくまで既定値なので、利用者が自分で選び直したあとは呼び出し側が上書きしないこと。
 */
export function defaultRegulationIdForRecordForm(
  isOfficialEventTab: boolean,
  officialEvent: OfficialEventTitle | null,
): number {
  if (!isOfficialEventTab) return DEFAULT_REGULATION_ID;

  return defaultRegulationIdForOfficialEvent(officialEvent);
}

// 対戦環境チップを表示する公式イベントかどうかを判定する。
// ジムバトル・トレーナーズリーグ・シティリーグ・チャンピオンズリーグ・PJCS のみ表示する。
export function shouldShowEnvironmentChip(officialEvent: OfficialEventKind): boolean {
  // 大型大会のうちチャンピオンズリーグ・PJCS・スクランブルバトル
  if (officialEvent.type_id === 1) {
    return (
      officialEvent.title.includes("チャンピオンズリーグ") ||
      isPJCS(officialEvent) ||
      officialEvent.title.includes("スクランブルバトル")
    );
  }
  // シティリーグ
  if (officialEvent.type_id === 2) return true;
  // トレーナーズリーグ
  if (officialEvent.type_id === 3) return true;

  // ジムバトル・MEGAウインターリーグ・マイジムNo.1決定戦
  if (officialEvent.type_id === 4) {
    return (
      officialEvent.title.includes("ジムバトル") ||
      officialEvent.title.includes("MEGAウインターリーグ") ||
      officialEvent.title.includes("マイジムNo.1決定戦")
    );
  }
  return false;
}

/*
 * 公式イベントの種別アイコン/アクセント色を判定するヘルパー。
 * 一覧カード(OfficialEventRecord)と詳細カード(OfficialEventInfo)で共有する。
 */
export function getEventIconUrl(officialEvent: OfficialEventKind): string {
  if (officialEvent.type_id === 1) {
    if (isPJCS(officialEvent)) {
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
    if (officialEvent.title.includes("30th CELEBRATION スペシャルメダルグランプリ")) {
      return `${ICON_BASE}30th-celebration-special-medal-grand-prix.png`;
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
    if (officialEvent.title.includes("メガエルレイドexSARゲットバトル")) {
      return `${ICON_BASE}mega-gallade_ex_sar.png`;
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

/*
 * アイコン画像ごとの代替テキスト。getEventIconUrl の分岐をもう一度書くと
 * 片方だけ直して食い違うため、返ってきた URL から引く。
 */
const ICON_ALT: Record<string, string> = {
  "jcs.png": "ポケモンジャパンチャンピオンシップス",
  "cl.png": "チャンピオンズリーグ",
  "sb.png": "スクランブルバトル",
  "city.png": "シティリーグ",
  "trainers.png": "トレーナーズリーグ",
  "gym.png": "ジムバトル",
  "mega_winter_league.png": "MEGAウインターリーグ",
  "mygym_no1.png": "マイジムNo.1決定戦",
  "30th-celebration-special-medal-grand-prix.png":
    "30th CELEBRATION スペシャルメダルグランプリ",
  "organizer.png": "公認自主イベント",
  "classroom.png": "ポケモンカードゲーム教室",
  "victini_bwr.png": "ビクティニBWR争奪戦",
  "mega-gallade_ex_sar.png": "メガエルレイドexSARゲットバトル",
  "100_sonomama_battle.png": "スタートデッキ100　そのままバトル",
  "100_detatoko_battle.png":
    "100人大集合でたとこバトル ～スタートデッキ100 バトルコレクション～",
  "pokemon_card_game.png": "ポケモンカードゲーム",
};

// 種別アイコンの代替テキスト。イベント種別が分かる名前を返す。
export function getEventIconAlt(officialEvent: OfficialEventKind): string {
  const file = getEventIconUrl(officialEvent).slice(ICON_BASE.length);

  return ICON_ALT[file] ?? "ポケモンカードゲーム";
}

export function getEventAccentColor(officialEvent: OfficialEventKind): string {
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

// 主催店舗名(会場)の表示ラベル。shop_name を優先し、無ければ venue を使う。
// 記録カード各所(TweetButton等)と同じフォールバック規約。
export function getEventVenueLabel(officialEvent: OfficialEventVenue): string {
  return officialEvent.shop_name?.trim() || officialEvent.venue?.trim() || "";
}

// イベントの種別名。種別チップの表示は廃止したため、現在は公式イベントガイド
// (useOfficialEventGuide)のキーワード判定にだけ使う。
export function getEventTypeName(officialEvent: OfficialEventKind): string {
  if (officialEvent.type_id === 1) {
    if (isPJCS(officialEvent)) return "PJCS";
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
