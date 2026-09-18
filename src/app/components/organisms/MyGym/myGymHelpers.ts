import { OfficialEventType } from "@app/types/official_event";
import { getEventVenueLabel } from "@app/components/organisms/Record/officialEventHelpers";
import { toDateKey } from "@app/utils/calendar";
import { formatJSTTime } from "@app/utils/date";

// 期間の規則は utils/myGymEventRange に移した(サーバ側の初期取得と共有するため)。
// 既存の呼び出し元のためにここからも出す
export { MY_GYM_EVENT_RANGE_DAYS, getMyGymEventRange } from "@app/utils/myGymEventRange";

export type MyGymEventGroup = {
  dateKey: string;
  label: string;
  events: OfficialEventType[];
  // その日の会場(重複を除く)。畳んだ日付行に並べる
  venues: string[];
};

/*
 * 日付グループに含まれる会場の一覧。重複は落とす。
 *
 * 同じ店舗がその日に何本もイベントを持つことが多い(ジムバトルは週次開催で、
 * 時間帯違いが並ぶ)ので、畳んだ行に出すのは「どの店か」だけでよい。
 * 並びはイベントの並び(上流が返す日付・開始時刻の昇順)のままにする。
 */
export function getEventGroupVenues(events: OfficialEventType[]): string[] {
  const venues: string[] = [];

  for (const event of events) {
    const venue = getEventVenueLabel(event);

    if (venue && !venues.includes(venue)) venues.push(venue);
  }

  return venues;
}

// 「9月1日(月)」形式。年は期間が2週間で年跨ぎの誤読が起きないため省く。
function formatGroupLabel(dateKey: string): string {
  // dateKey は JST の暦日。new Date(dateKey) は UTC 0時として解釈されるため、
  // 表示のために UTC のまま読み出す(ローカルTZで日付がずれないように)。
  const d = new Date(`${dateKey}T00:00:00Z`);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][d.getUTCDay()];

  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日(${weekday})`;
}

// イベントを開催日ごとにまとめる。上流が日付・開始時刻の昇順で返すので、
// ここでは並べ替えずに出現順のままグループへ積む。
export function groupEventsByDate(events: OfficialEventType[]): MyGymEventGroup[] {
  const groups: MyGymEventGroup[] = [];

  for (const event of events) {
    // date は上流がローカル時刻の0時に揃えて返すため、そのままキーに使える
    const dateKey = toDateKey(event.date);
    const last = groups[groups.length - 1];

    if (last && last.dateKey === dateKey) {
      last.events.push(event);
      continue;
    }

    groups.push({ dateKey, label: formatGroupLabel(dateKey), events: [event], venues: [] });
  }

  // 会場はグループが出そろってから入れる。ここで持たせておくと、日付行を描くたびに
  // 新しい配列ができて会場チップの計測(ResizeObserver)が毎回張り直しになるのを避けられる
  for (const group of groups) {
    group.venues = getEventGroupVenues(group.events);
  }

  return groups;
}

export type MyGymEventTimeRange = {
  start: string;
  // 終了時刻が無いイベントは null。書式は呼び出し側に任せる(パネルは幅を揃えるために
  // 開始・終了を別々に描くので、整形済みの文字列だけでは足りない)。
  end: string | null;
};

// イベントの開催時刻。started_at / ended_at が 00:00 のものは時刻未設定として扱う
// (公式サイト側で時刻が入っていないイベントがある)。開始時刻も無ければ null。
export function getEventTimeRange(event: OfficialEventType): MyGymEventTimeRange | null {
  // 上流は開催時刻を JST の "+09:00" 付きで返すため、JST 固定で読む
  const startedAt = formatJSTTime(event.started_at);
  const endedAt = formatJSTTime(event.ended_at);

  if (startedAt === "00:00") return null;

  return { start: startedAt, end: endedAt === "00:00" ? null : endedAt };
}

// 「10:00 ~ 12:00」。終了時刻が無いイベントは「10:00 ~」と末尾の波線まで出す。
// 開始時刻だけを裸で置くと開催時点に読めてしまうため、記録作成の公式イベント選択
// (OfficialEventSelect)と同じく「ここから始まる」と分かる形に揃える。
export function formatEventTime(event: OfficialEventType): string {
  const time = getEventTimeRange(event);

  if (!time) return "";

  return time.end ? `${time.start} ~ ${time.end}` : `${time.start} ~`;
}

/*
 * 一覧を開いた直後から中身が見えている日付の数。既定は 0(すべて畳む)。
 *
 * この節はホームの上から4番目にあるため、パネルが縦に伸びるほど下の節まで
 * 読む距離が延びる。実測(Myジム5店舗・7日で21件、390x844 のカード高さ):
 *   0日 246px / 1日 420px / 2日 594px
 * 畳んでいても日付と件数は並ぶので、「今週いつ何件あるか」はここで読める。
 */
export const MY_GYM_INITIAL_EXPANDED_GROUPS: number = 0;

/*
 * 日付グループが開いているか。
 *
 * 開閉そのものを状態に持たず、「利用者が触った日付」(overrides)だけを覚えて、
 * 触っていない日付は先頭から数えた位置で決める。全日付ぶんの開閉を作り置きすると、
 * 再取得(店舗の登録・解除や日付跨ぎ)で並びが変わったときに古い日付の状態が残り、
 * 先頭が畳まれたままになる。
 */
export function isEventGroupExpanded(
  overrides: Record<string, boolean>,
  dateKey: string,
  index: number,
): boolean {
  return overrides[dateKey] ?? index < MY_GYM_INITIAL_EXPANDED_GROUPS;
}
