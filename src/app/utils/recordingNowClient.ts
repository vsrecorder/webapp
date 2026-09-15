import { mutate } from "swr";

import { readClientCookie, writeClientCookie } from "@app/utils/clientCookie";
import {
  DASHBOARD_LAYOUT_COOKIE,
  DASHBOARD_LAYOUT_COOKIE_MAX_AGE,
  RECORDING_NOW_BLOCK_IDS,
  parseDashboardLayout,
  serializeDashboardLayout,
} from "@app/utils/dashboardLayout";

/*
 * 「記録中」をブラウザ側で終わらせるときの後始末。
 * ホーム上部のカードと画面下のバーの両方から呼ぶ(どちらで終えても結果は同じにする)。
 */

/*
 * 画面下のバーが SWR で使うキー。
 *
 * ホームのカードから「記録を終える」を押したときにも、このキーのキャッシュを捨てる
 * 必要がある。カードはサーバ描画なので router.refresh() で消えるが、バーはブラウザから
 * 取っているので、捨てないと終えたはずの記録が下に残り続ける。
 */
export const RECORDING_NOW_SWR_KEY = "/api/recording_now";

/*
 * バーが持っている「記録中」を捨てて取り直させる。
 *
 * バーはブラウザから取っていて、しかも往復を抑えるために60秒は同じ結果を使い回す。
 * 記録中のイベントが変わる操作(記録を作った・対戦を足した・記録を終えた)のあとは、
 * その間引きを飛び越えて今の状態に合わせる必要がある。
 * 呼ばないと、新しく作った記録がバーに出るまで最大1分かかる。
 */
export function refreshRecordingNow(): void {
  void mutate(RECORDING_NOW_SWR_KEY);
}

/*
 * ホームの骨格の並び(cookie)から「記録中」を取り除く。
 *
 * 骨格(DashboardSkeleton)は「前回このホームが実際に描いた並び」で出るので、
 * 終えたことをここへ反映しないと、次にホームを開いたときに実体の無い骨格だけが
 * 数秒ぶん居座る(ホームは取得が多く、Suspense が解けるまで時間がかかる)。
 *
 * 使用デッキの行の有無でブロックIDが2種類あるため、どちらが書かれていても外す。
 */
export function dropRecordingNowFromStoredLayout(): void {
  const stored = parseDashboardLayout(readClientCookie(DASHBOARD_LAYOUT_COOKIE));
  if (!stored?.some((id) => RECORDING_NOW_BLOCK_IDS.includes(id))) return;

  writeClientCookie(
    DASHBOARD_LAYOUT_COOKIE,
    serializeDashboardLayout(stored.filter((id) => !RECORDING_NOW_BLOCK_IDS.includes(id))),
    DASHBOARD_LAYOUT_COOKIE_MAX_AGE,
  );
}

/*
 * 画面下のバーの高さを載せる CSS 変数。
 *
 * 本文の下余白・フローティングボタン・カードのクリアランスは、いずれも
 * --mobile-nav-height を基準に組んである。バーのぶんはこの変数で足す。
 * 出ていないときは 0 にする(変数を消すと参照側の calc がすべて壊れる)。
 *
 * 値は実寸(px)で入れること。クリアランスの計算(FloatingButtonClearance)が
 * JS から読むので、rem のままだと換算が要る。
 */
export const RECORDING_BAR_HEIGHT_VAR = "--recording-bar-height";
