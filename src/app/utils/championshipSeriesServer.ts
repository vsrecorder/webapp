import { ChampionshipSeriesType } from "@app/types/championship_series";
import { upstreamUrl } from "@app/utils/upstream";

// チャンピオンシップシリーズ一覧を、サーバコンポーネントで取得する。
//
// シーズン選択を持つパネル(称号とランク・バッジなど)は、渡された一覧から現在シーズンを決めて
// データを取得する。クライアント側で後から取得して渡す構成だと、初回マウント時は一覧が空のため
// まず season 未指定で取得し、一覧が届いてから現在シーズンで取り直す二度手間になる
// (スケルトンも二度出る)。そのため一覧はページ(サーバ側)で取得し、最初から揃った状態で渡す。

// 滅多に増えないマスタデータのため、キャッシュ期間は長めに取る。
const REVALIDATE_SEC = 3600;

export async function getAllChampionshipSeries(): Promise<ChampionshipSeriesType[]> {
  const res = await fetch(upstreamUrl`/api/v1beta/championship_series`, {
    next: { revalidate: REVALIDATE_SEC },
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (res.status === 200) return res.json();
  return [];
}
