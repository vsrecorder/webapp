import { auth } from "@app/auth";
import { redirect } from "next/navigation";

import TemplateUser from "@app/components/templates/User";
import { getAllChampionshipSeries } from "@app/utils/championshipSeriesServer";

export default async function Page() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  // 称号とランク・バッジのパネルは、渡された一覧から現在シーズンを決めてデータを取得する。
  // クライアント側で後から取得すると初回は season 未指定で取得してから取り直す二度手間になるため、
  // ここで取得して最初から揃った状態で渡す(championshipSeriesServer.ts 参照)。
  // 取得できなくても各パネルは season 未指定(バックエンド既定=現在シーズン)で動くので、空で続行する。
  const championshipSeries = await getAllChampionshipSeries().catch(() => []);

  return <TemplateUser id={session.user.id} championshipSeries={championshipSeries} />;
}
