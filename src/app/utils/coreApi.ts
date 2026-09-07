// core-apiserver をサーバコンポーネントから引くための共通部分。
// シティリーグ結果(utils/cityleague.ts)と大型大会結果(utils/championsleague.ts)が共有する。

// 過去イベントの結果は確定後に変わらないため、長めにキャッシュする。
const DEFAULT_REVALIDATE_SECONDS = 60 * 60 * 24;

/*
 * 新しい結果やイベントが増えていく一覧向け。
 *
 * 確定した個別ページと違い、ここが古いままだと新着が出てこない。結果の登録は
 * 開催から数日遅れるので数分の遅れは実害にならないが、既定の1日は長すぎる。
 */
export const LIST_REVALIDATE_SECONDS = 300;

import { upstreamOrigin } from "@app/utils/upstream";

// 向き先は utils/upstream と同じ(VSRECORDER_UPSTREAM_ORIGIN があれば直接、無ければ公開ドメイン経由)
export function coreApiUrl(path: string): string {
  return `${upstreamOrigin()}${path}`;
}

export async function getJson<T>(
  path: string,
  revalidateSeconds: number = DEFAULT_REVALIDATE_SECONDS,
): Promise<T | null> {
  const res = await fetch(coreApiUrl(path), {
    method: "GET",
    headers: { Accept: "application/json" },
    /*
     * cache を明示しないと、ここで指定した revalidate が効かない。
     *
     * fetch の既定は "auto no cache" で、ルートが動的だとリクエストごとに上流へ行く。
     * このアプリはルートレイアウト(TemplateLayout)が auth() を呼ぶため全ルートが動的なので、
     * 常にその条件に当てはまっていた。本番の nginx ログでは、明示している
     * /api/regulations がブラウザ82件に対し上流2件で済んでいるのに対し、
     * ここを通るシティリーグ系はブラウザ30件に対し上流255件だった。
     */
    cache: "force-cache",
    next: { revalidate: revalidateSeconds },
  });

  // 404 は「本当に存在しない」ので null を返し、呼び出し元の notFound() に流す。
  if (res.status === 404) return null;

  // それ以外の失敗は一時的な障害の可能性がある。ここで null を返すと notFound() に
  // 流れ、生きているページが noindex 付きで返る。noindex は 404 や 500 と違って
  // 「意図的にインデックスするな」という指示なので、障害中にクロールされた分だけ
  // 検索結果から外れてしまう。例外にして 500 を返し、クローラに再訪させる。
  if (!res.ok) {
    throw new Error(`core-apiserver responded ${res.status}: ${path}`);
  }

  return res.json();
}
