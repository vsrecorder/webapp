"use client";

import { saveReturnAnchorTop, writeReturnTarget } from "@app/utils/returnTarget";
import { writeSessionStorage } from "@app/utils/sessionStorageStore";

/*
 * バトルレポートの一覧(/users/report)が、各期間のレポートから戻ってきたときに
 * 元の位置へ戻すための控え(sessionStorage)。
 *
 * 一覧の材料はクライアントで取得するので、戻ってから取り直すと取得中は文書が縮み、
 * 位置を合わせられるのは届いた後になる(先頭に出てから飛ぶ)。そこで進む直前に
 * 一覧の中身ごと控え、戻ったら控えから描いてすぐ位置を合わせ、裏で取り直す
 * (みんなの公開デッキの一覧と同じ考え方。utils/sharedDecksReturn)。
 */

export const REPORT_INDEX_RETURN_KEY = "reportIndexReturn";

export type ReportIndexReturnState<T> = {
  // 控えたときのユーザー(別のユーザーでログインし直したときに使わない)
  userId: string;
  // 押したタイルの目印(id)
  anchorId: string;
  // 押した時点の一覧の材料
  data: T;
  savedAt: number;
};

// タイルの目印(id)。戻ったときにこの位置まで移動する
export function reportTileAnchorId(tileKey: string): string {
  return `report-tile-${tileKey}`;
}

// 各期間のレポートへ進む直前に呼ぶ。今表示している一覧には受け取らせない(writeReturnTarget)
export function markReportIndexReturn<T>(
  state: Omit<ReportIndexReturnState<T>, "savedAt">,
): void {
  saveReturnAnchorTop(state.anchorId);

  // 書けなかったときに前回の控えが残らないよう、先に消しておく(先頭から出るだけで済む)
  writeSessionStorage(REPORT_INDEX_RETURN_KEY, null);
  writeReturnTarget(REPORT_INDEX_RETURN_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
}

// 位置を合わせ終えた・使わなかったら消す(次に普通に開いたときに古い一覧を出さない)
export function clearReportIndexReturn(): void {
  writeSessionStorage(REPORT_INDEX_RETURN_KEY, null);
}

// 控えた値を読む。壊れていれば null(先頭から出す)
export function parseReportIndexReturn<T>(raw: string | null): ReportIndexReturnState<T> | null {
  if (!raw) return null;

  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;

    const state = value as ReportIndexReturnState<T>;
    if (
      typeof state.userId !== "string" ||
      typeof state.anchorId !== "string" ||
      typeof state.savedAt !== "number" ||
      typeof state.data !== "object" ||
      state.data === null
    ) {
      return null;
    }

    return state;
  } catch {
    return null;
  }
}
