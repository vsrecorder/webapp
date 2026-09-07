import { toDateKey } from "@app/utils/calendar";

/*
 * Myジムパネルに出すイベントの期間。
 *
 * パネル(MyGymPanel)と、ダッシュボードの初期データをサーバで取る側(dashboardServer)の
 * 両方が同じ規則で期間を決める必要があるため、部品の下ではなく utils に置く。
 * 食い違うとサーバで取った初期値がパネルの見ている期間と合わず、使われないまま取り直しになる。
 */

// パネルに出す期間の日数(今日を含めて2週間)。
// ジムイベントは週次開催が多く、2週間あれば「次にいつ行けるか」が一通り見える。
// 伸ばすと登録店舗ぶんの件数がそのまま増えてパネルが読めなくなるため、既定はここで止める。
export const MY_GYM_EVENT_RANGE_DAYS = 14;

export type MyGymEventRange = { startDate: string; endDate: string };

// 期間の開始日(今日)と終了日を JST の "YYYY-MM-DD" で返す。
// 上流は date カラム(日付のみ)と突き合わせるため、時刻は持たせない。
export function getMyGymEventRange(): MyGymEventRange {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  return {
    startDate: toDateKey(now),
    endDate: toDateKey(now + (MY_GYM_EVENT_RANGE_DAYS - 1) * dayMs),
  };
}
