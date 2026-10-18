"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { useReturnTargetItem } from "@app/hooks/useReturnTargetItem";
import {
  REPORT_INDEX_RETURN_KEY,
  ReportIndexReturnState,
  clearReportIndexReturn,
  parseReportIndexReturn,
} from "@app/utils/reportIndexReturn";
import { hasReturnedHereSince } from "@app/utils/returnNavigation";
import { scrollBackToAnchor } from "@app/utils/returnTarget";

/*
 * バトルレポートの一覧が、各期間のレポートから戻ってきたときの控え(utils/reportIndexReturn)を
 * 受け取る。戻すべきでなければ null。
 *
 * 受け取るのは、一覧が現れた時点で既に書かれていたものだけ(useReturnTargetItem)。位置を
 * 合わせ終えると控えは消すが、一覧はそのまま控えの中身で描き続けたいので、最初に受け取った
 * 値を持ち続ける(レンダー中の前回値比較)。ハイドレーションの最初の描画では null なので、
 * ページごと読み込まれて戻ったときは、その直後に控えを受け取る。
 */
export function useRestoredReportIndex<T>(userId: string): ReportIndexReturnState<T> | null {
  const pathname = usePathname();
  const saved = useReturnTargetItem(REPORT_INDEX_RETURN_KEY);
  const [restoredRaw, setRestoredRaw] = useState<string | null>(null);
  if (saved !== null && saved !== restoredRaw) setRestoredRaw(saved);

  const state = useMemo(() => parseReportIndexReturn<T>(restoredRaw), [restoredRaw]);
  // 戻ってきたとき(ブラウザの戻る/進む・レポート先頭の戻るリンク)だけ戻す。控えを置いたまま
  // 下部ナビなど別の経路で開き直したときは先頭から(utils/returnNavigation)
  const accepted =
    state !== null &&
    state.userId === userId &&
    hasReturnedHereSince(state.savedAt, pathname ?? undefined);

  // 使わなかった控え・読めない控えは消す。残すと、この一覧から進んで戻ったときに古い一覧が出る
  const discarded = restoredRaw !== null && !accepted;
  useEffect(() => {
    if (discarded) clearReportIndexReturn();
  }, [discarded]);

  return accepted ? state : null;
}

/*
 * 戻ってきて一覧が描けたら、押したタイルを離れる前と同じ画面上の高さへ置き、控えを消す。
 * ページ遷移の先頭リセット(useScrollResetOnNavigation)は親の effect でこれより後に走るので、
 * フレームを1つ待ってから動かす。
 */
export function useScrollBackToReportTile(
  restored: ReportIndexReturnState<unknown> | null,
  ready: boolean,
  fallbackTop: number,
): void {
  useEffect(() => {
    if (!restored || !ready) return;

    clearReportIndexReturn();

    const frame = requestAnimationFrame(() => {
      scrollBackToAnchor(restored.anchorId, fallbackTop);
    });

    return () => cancelAnimationFrame(frame);
  }, [restored, ready, fallbackTop]);
}

/*
 * 控えから描いた一覧を、1回だけ裏で取り直して最新に寄せる(進んだ先で記録を足した場合など)。
 * タイルは高さが決まっているので、並びが変わらなければ位置は動かない。
 */
export function useRefreshOnReportIndexRestore(
  restored: ReportIndexReturnState<unknown> | null,
  refresh: () => void,
): void {
  // 開発時の StrictMode で2回取りに行かないよう、1回だけにする
  const refreshed = useRef(false);

  useEffect(() => {
    if (!restored || refreshed.current) return;
    refreshed.current = true;
    refresh();
  }, [restored, refresh]);
}
