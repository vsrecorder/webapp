import { toDateKey } from "@app/utils/calendar";

/*
 * Myジムパネルに出すイベントの期間。
 *
 * パネル(MyGymPanel)と、ダッシュボードの初期データをサーバで取る側(dashboardServer)の
 * 両方が同じ規則で期間を決める必要があるため、部品の下ではなく utils に置く。
 * 食い違うとサーバで取った初期値がパネルの見ている期間と合わず、使われないまま取り直しになる。
 */

/*
 * パネルに出す期間の日数(今日を含めて1週間)。
 *
 * 以前は2週間だった。ジムイベントは週次開催なので、2週目はほとんどが1週目の繰り返しになる
 * (実データで2週目25件のうち19件=76%が同じ店・同じ曜日・同じ時刻・同じ名前。純粋に新しいのは
 * 隔週のトレーナーズリーグなど6件だけ)。一方、件数はそのまま DOM とサーバ描画の重さになる。
 *
 * イベント一覧は max-h-62 の内部スクロール(見えているのは 248px = 3〜4件)なので、
 * 件数を半分にしても節の高さもページの高さも変わらない。本番ビルド・CPU 4x・並の 4G での
 * 実測(2026-09-08、3回の中央値)では、ホームの中身が出揃うまでが 6.65 → 5.73 秒、
 * ページ全体の DOM ノードが 2107 → 1807(-14%)、RSC が 222 → 209KB。
 *
 * 伸ばすと登録店舗ぶんの件数がそのまま増えてパネルが読めなくなるため、既定はここで止める。
 */
export const MY_GYM_EVENT_RANGE_DAYS = 7;

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
