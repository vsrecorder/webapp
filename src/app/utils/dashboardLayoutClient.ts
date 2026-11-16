import { readClientCookie, writeClientCookie } from "@app/utils/clientCookie";
import {
  DASHBOARD_LAYOUT_COOKIE,
  DASHBOARD_LAYOUT_COOKIE_MAX_AGE,
  DashboardBlockId,
  parseDashboardLayout,
  serializeDashboardLayout,
} from "@app/utils/dashboardLayout";

/*
 * ホームの骨格の並び(cookie)から、指定したブロックを取り除く。
 *
 * 骨格(DashboardSkeleton)は「前回このホームが実際に描いた並び」で出るので、
 * カードを閉じたことをここへ反映しないと、次にホームを開いたときに実体の無い骨格だけが
 * 数秒ぶん居座る(ホームは取得が多く、Suspense が解けるまで時間がかかる)。
 *
 * 「記録中」カード(recordingNowClient)と「おかえり」カード(WinbackCard)が使う。
 */
export function dropBlocksFromStoredLayout(ids: readonly DashboardBlockId[]): void {
  const stored = parseDashboardLayout(readClientCookie(DASHBOARD_LAYOUT_COOKIE));
  if (!stored?.some((id) => ids.includes(id))) return;

  writeClientCookie(
    DASHBOARD_LAYOUT_COOKIE,
    serializeDashboardLayout(stored.filter((id) => !ids.includes(id))),
    DASHBOARD_LAYOUT_COOKIE_MAX_AGE,
  );
}
