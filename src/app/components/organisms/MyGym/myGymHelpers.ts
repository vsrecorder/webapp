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

export type MyGymEventTimeRange = {
  start: string;
  // 終了時刻が無いイベントは null。書式は呼び出し側に任せる(パネルは幅を揃えるために
  // 開始・終了を別々に描くので、整形済みの文字列だけでは足りない)。
  end: string | null;
};

// イベントの開催時刻。started_at / ended_at が 00:00 のものは時刻未設定として扱う
// (公式サイト側で時刻が入っていないイベントがある)。開始時刻も無ければ null。
export function getEventTimeRange(event: OfficialEventType): MyGymEventTimeRange | null {
  const format = (value: OfficialEventType["started_at"]) => {
    const d = new Date(value);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");

    return `${hh}:${mm}`;
  };

  const startedAt = format(event.started_at);
  const endedAt = format(event.ended_at);

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
