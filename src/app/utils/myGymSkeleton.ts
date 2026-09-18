import { MY_GYM_EVENT_RANGE_DAYS } from "@app/utils/myGymEventRange";

/*
 * Myジムパネルの骨格が取る場所。
 *
 * このパネルは中身で高さが大きく変わる(390px 幅での実測: 未登録 184px /
 * 登録済みで予定0件 106px / 畳んだ日付行が7本 354px)。骨格をひとつの高さに
 * 決め打つと、多くのユーザーで読み込み後に 100〜250px 跳ねる。
 * 前回このユーザーのホームが実際に描いた形を覚えておき、次の骨格をその形で出す。
 *
 * localStorage ではなく cookie なのは、この骨格の主な出番がサーバ描画の
 * Suspense fallback(DashboardSkeleton)で、そこからは localStorage を読めないため。
 * ホームの並び(utils/dashboardLayout)と同じ考え方。
 */

export const MY_GYM_SKELETON_COOKIE = "myGymSkeleton";
// 1年保つ。Myジムの登録も通う店の予定もそう頻繁には変わらないので、間隔が空いた再訪でも効かせたい
export const MY_GYM_SKELETON_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type MyGymSkeletonShape =
  // Myジム未登録(パネル全体が登録への導線になる)
  | { kind: "unregistered" }
  // 登録済みだが期間内に予定が無い
  | { kind: "noEvents" }
  // 畳んだ日付行が rows 本
  | { kind: "rows"; rows: number };

/*
 * cookie が無いとき(初回訪問・別ブラウザ・書き換え)の形。
 *
 * 登録済みで予定がある人を想定しつつ、期間いっぱいの7本ではなく中ほどに置く。
 * 7本に寄せると、店舗が少ない人や閑散期で 150px 以上縮む。
 */
export const DEFAULT_MY_GYM_SKELETON: MyGymSkeletonShape = { kind: "rows", rows: 5 };

export function formatMyGymSkeleton(shape: MyGymSkeletonShape): string {
  if (shape.kind === "unregistered") return "none";
  if (shape.kind === "noEvents") return "empty";

  return String(shape.rows);
}

// cookie は誰でも書き換えられるので、知っている形と期間に収まる本数だけを通す。
// 読めない値は null を返し、呼び出し側が既定の形にフォールバックする。
export function parseMyGymSkeleton(value: string | undefined): MyGymSkeletonShape | null {
  if (!value) return null;
  if (value === "none") return { kind: "unregistered" };
  if (value === "empty") return { kind: "noEvents" };

  const rows = Number(value);

  if (!Number.isInteger(rows) || rows < 1 || rows > MY_GYM_EVENT_RANGE_DAYS) return null;

  return { kind: "rows", rows };
}

/*
 * その形で骨格が取る高さ(rem)。実体の実測から出している。
 *   未登録  py-6 3 + アイコン 1.5 + gap-3 0.75 + 文言 3.5 + gap-3 0.75 + ボタン 2 = 11.5rem
 *   予定0件 p-3 1.5 + 登録中の行 1.5 + gap-2.5 0.625 + 文言(py-4 2 + 行 1)  = 6.625rem
 *   N 本    p-3 1.5 + 登録中の行 1.5 + gap-2.5 0.625 + 行 2N + gap-3 0.75(N-1)
 *           = 2.875 + 2.75N rem
 *
 * px ではなく rem で持つ。globals.css は幅 640〜767px でルートの文字サイズを 112.5% に
 * するので、実体(padding も行の高さも rem)はその帯で 1.125 倍になる。px 固定にすると
 * 744px 幅でだけ骨格と実体が 44px ずれる(実測)。
 */
export function myGymSkeletonHeightRem(shape: MyGymSkeletonShape): number {
  if (shape.kind === "unregistered") return 11.5;
  if (shape.kind === "noEvents") return 6.625;

  return 2.875 + 2.75 * shape.rows;
}

/*
 * いま描いている中身が、次回どの形で場所を取るべきか。
 * MyGymPanel が実体を描けたときに呼んで cookie へ残す。
 */
export function currentMyGymSkeleton(
  userGyms: readonly unknown[],
  groupCount: number,
): MyGymSkeletonShape {
  if (userGyms.length === 0) return { kind: "unregistered" };
  if (groupCount === 0) return { kind: "noEvents" };

  return { kind: "rows", rows: groupCount };
}
