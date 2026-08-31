import { OfficialEventType } from "@app/types/official_event";
import { toDateKey } from "@app/utils/calendar";

// パネルに出す期間の日数(今日を含めて2週間)。
// ジムイベントは週次開催が多く、2週間あれば「次にいつ行けるか」が一通り見える。
// 伸ばすと登録店舗ぶんの件数がそのまま増えてパネルが読めなくなるため、既定はここで止める。
export const MY_GYM_EVENT_RANGE_DAYS = 14;

// 期間の開始日(今日)と終了日を JST の "YYYY-MM-DD" で返す。
// 上流は date カラム(日付のみ)と突き合わせるため、時刻は持たせない。
export function getMyGymEventRange(): { startDate: string; endDate: string } {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  return {
    startDate: toDateKey(now),
    endDate: toDateKey(now + (MY_GYM_EVENT_RANGE_DAYS - 1) * dayMs),
  };
}

export type MyGymEventGroup = {
  dateKey: string;
  label: string;
  events: OfficialEventType[];
};

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

    groups.push({ dateKey, label: formatGroupLabel(dateKey), events: [event] });
  }

  return groups;
}

// イベントの開催時刻。started_at / ended_at が 00:00 のものは時刻未設定として出さない
// (公式サイト側で時刻が入っていないイベントがある)。
export function formatEventTime(event: OfficialEventType): string {
  const format = (value: OfficialEventType["started_at"]) => {
    const d = new Date(value);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");

    return `${hh}:${mm}`;
  };

  const startedAt = format(event.started_at);
  const endedAt = format(event.ended_at);

  if (startedAt === "00:00") return "";
  if (endedAt === "00:00") return startedAt;

  return `${startedAt} ~ ${endedAt}`;
}

// パネルが既定で見せるイベントの件数。
//
// 2週間ぶんは数店舗も登録すれば20件を超えることがあり、そのまま並べるとパネルだけで
// 画面が何枚分にもなる。ホームは他の節と並ぶ場所なので、既定は直近ぶんに留めて
// 残りは開いて見てもらう。
export const MY_GYM_VISIBLE_EVENT_COUNT = 5;

// グループの並び順を保ったまま、合計が max 件になるところで打ち切る。
// 日付グループの途中で切れてもよい(続きは展開すれば出る)。
export function limitEventGroups(
  groups: MyGymEventGroup[],
  max: number,
): MyGymEventGroup[] {
  const ret: MyGymEventGroup[] = [];
  let count = 0;

  for (const group of groups) {
    if (count >= max) break;

    const events = group.events.slice(0, max - count);
    ret.push({ ...group, events });
    count += events.length;
  }

  return ret;
}
