import { RecordCreateOfficialEventType } from "@app/types/official_event";
import {
  cleanOfficialEventTitle,
  getEventIconAlt,
  getEventIconUrl,
  getEventVenueLabel,
} from "@app/components/organisms/Record/officialEventHelpers";
import { formatJSTDateWithWeekday, formatJSTTime } from "@app/utils/date";
import { katakanaToHiragana } from "@app/utils/kana";

/*
 * 公式イベントの選択肢(react-select)。
 *
 * 記録の作成(RecordCreate)・クイック作成・イベント情報の編集が同じ形を使う。
 * label は表示ではなく react-select の絞り込みにだけ使う(表示は formatOptionLabel)。
 */
export type OfficialEventOption = {
  label: string;
  value: string;
  id: number;
  date: Date;
  started_at: Date;
  ended_at: Date;
  type_id: number;
  event_time: string;
  event_datetime: string;
  title: string;
  shop_name: string;
  address: string;
  image_alt: string;
  image_src: string;
};

export function toOfficialEventOption(
  officialEvent: RecordCreateOfficialEventType,
): OfficialEventOption {
  // 時刻はJST固定で読む(端末のタイムゾーンで読むと海外の端末で開催時刻がずれる)。
  // formatJSTTime は書式を作り置きしているので、件数が多くても toLocaleString ほど遅くならない。
  let startedAt = formatJSTTime(officialEvent.started_at);
  let endedAt = formatJSTTime(officialEvent.ended_at);
  let eventTime = "";

  if (endedAt === "00:00") {
    endedAt = "";
  }
  if (startedAt === "00:00") {
    startedAt = "";
  }
  if (startedAt !== "") {
    eventTime = startedAt + " ~ ";
    if (endedAt !== "") {
      eventTime = eventTime + endedAt;
    }
  }

  // toLocaleString は呼ぶたびに Intl.DateTimeFormat を作り直すため、1日ぶんの候補
  // (土日は1,400件超)を整形すると桁違いに遅い。作り置きの書式を使う共通ヘルパへ委譲する。
  const datetime = formatJSTDateWithWeekday(officialEvent.date) + " " + eventTime;

  // SWR のキャッシュに入っている元データを書き換えないよう、整形結果はローカルに持つ
  const title = cleanOfficialEventTitle(officialEvent.title);
  const venue = getEventVenueLabel(officialEvent);

  // トレーナーズリーグは「とれり」「トレリ」の通称で探されるため、絞り込み文字列に足す
  const tag = officialEvent.type_id === 3 ? "とれり トレリ" : "";

  return {
    // 絞り込みは会場名・住所・開催時刻でも効かせる(プレースホルダの「例）町田市」は住所の検索)。
    // タイトルはカタカナをひらがなにしたものも混ぜ、かな入力のままでも引けるようにする。
    label:
      title +
      " - " +
      katakanaToHiragana(title) +
      " " +
      venue +
      " " +
      eventTime +
      " " +
      officialEvent.address +
      " " +
      tag,
    value: officialEvent.id.toString(),
    id: officialEvent.id,
    date: new Date(officialEvent.date),
    started_at: new Date(officialEvent.started_at),
    ended_at: new Date(officialEvent.ended_at),
    type_id: officialEvent.type_id,
    event_time: eventTime,
    event_datetime: datetime,
    title: title,
    shop_name: venue,
    address: officialEvent.address,
    // アイコンの判定は整形前のタイトルで行う(cleanOfficialEventTitle が消す
    // 括弧書きに種目名が入ることがあるため)
    image_alt: getEventIconAlt(officialEvent),
    image_src: getEventIconUrl(officialEvent),
  };
}
