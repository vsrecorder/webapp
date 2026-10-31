import { auth } from "@app/auth";
import { redirectToSignIn, type SearchParams } from "@app/utils/signInReturnServer";

import TemplateUser from "@app/components/templates/User";
import { getAllChampionshipSeries } from "@app/utils/championshipSeriesServer";

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function Page({ searchParams }: Props) {
  const session = await auth();
  if (!session) {
    redirectToSignIn("/users", await searchParams);
  }

  // 称号とランク・バッジのパネルは、渡された一覧から現在シーズンを決めてデータを取得する。
  // クライアント側で後から取得すると初回は season 未指定で取得してから取り直す二度手間になるため、
  // ここで取得して最初から揃った状態で渡す(championshipSeriesServer.ts 参照)。
  // 取得できなくても各パネルは season 未指定(バックエンド既定=現在シーズン)で動くので、空で続行する。
  const championshipSeries = await getAllChampionshipSeries().catch(() => []);

  return <TemplateUser id={session.user.id} championshipSeries={championshipSeries} />;
}
