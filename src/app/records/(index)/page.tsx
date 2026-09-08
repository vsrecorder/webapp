import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@app/auth";

import TemplateRecords from "@app/components/templates/Records";

import { RECORDS_SELECTED_TAB_COOKIE, parseRecordsTab } from "@app/utils/recordListPrefs";
import { getRecordsInitialData } from "@app/utils/recordListServer";

export default async function Page() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  // 選択中タブは cookie に保存されている(recordListPrefs)。サーバ描画の時点でそのタブで描き、
  // ハイドレーション後に一覧が切り替わって見えないようにする
  const store = await cookies();
  const tab = parseRecordsTab(store.get(RECORDS_SELECTED_TAB_COOKIE)?.value) ?? "all";

  // そのタブの1ページ目を、カードの周辺情報(デッキ・イベント・対戦の集計)ごとサーバで取って
  // HTML に載せる(デッキ一覧と同じ型)。クライアントで取るとハイドレーション後の往復ぶん
  // 表示が遅れる。取れなければクライアントが取り直す
  const initial = await getRecordsInitialData(session.user.id, tab);

  return <TemplateRecords initial={initial} initialTab={tab} />;
}
