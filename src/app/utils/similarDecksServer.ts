import { SimilarDecksGetResponseType } from "@app/types/similar_deck";
import { parseSimilarDecksResponse } from "@app/utils/similarDecks";

/*
 * 自分のデッキに構成が近いシティリーグの入賞デッキを、バトラボ(vslab)からサーバ側で取得する。
 *
 * バトラボの類似デッキ検索(GET /api/similar)は、索引に無いデッキコード(利用者のデッキ)でも
 * 中身を取り寄せて比べる。こちらは結果を受け取って表示するだけで、類似度の計算も
 * デッキ分類も持たない。
 *
 * ブラウザから直接バトラボを引かず BFF(/api/deckcards/{code}/similar)を通すのは、デッキ分類
 * (deckArchetypeServer.ts)と同じ理由。同じデッキの照会は Data Cache に載り、CSP の
 * connect-src も広げずに済む。
 *
 * 取れなかった理由は分けて返す。利用者のコードの問題(公式サイトに無い・60 枚でない)は
 * そのまま画面に伝え、バトラボに届かないときだけ「いま取れない」として再試行させる。
 */

// バトラボの公開オリジン。開発機ではローカルの vslab(http://localhost:6757)を VSLAB_ORIGIN で指す
const DEFAULT_VSLAB_ORIGIN = "https://lab.vsrecorder.mobi";

/*
 * Data Cache に置く時間。バトラボ側の結果キャッシュ(5 分)より少し長い程度にする。
 * 入賞デッキは日に 1 回の取り込みで増えるので、この間隔で十分に追える。
 * Data Cache に載るのは 200 だけなので、無いコードの 404 が残ることはない
 */
const REVALIDATE_SECONDS = 600;

/*
 * バトラボを待つ上限。索引に無いデッキは公式サイトまで取りに行くので 1〜2 秒かかる。
 * 利用者がボタンを押して開くシートなので、ページ描画(3 秒)より長く待てる
 */
const TIMEOUT_MS = 8000;

// 環境 ID の形(vslab の ENVIRONMENT_ID_RE と同じ)。合わない値はバトラボに渡さない
const ENVIRONMENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

export type SimilarDecksResult =
  | { status: "ok"; data: SimilarDecksGetResponseType }
  // バトラボが理由を返した。not_found: 索引にも公式サイトにも無い / invalid: 書式外 /
  // unreadable: 60 枚になっていないなど、デッキとして読めない
  | { status: "not_found" | "invalid" | "unreadable" }
  // 届かない・時間切れ・応答が壊れている。やり直せば通るかもしれない
  | { status: "unavailable" };

function vslabOrigin(): string {
  return process.env.VSLAB_ORIGIN || DEFAULT_VSLAB_ORIGIN;
}

export async function getSimilarDecks(
  code: string,
  environmentId?: string | null,
): Promise<SimilarDecksResult> {
  const query = new URLSearchParams({ deckCode: code });
  if (environmentId && ENVIRONMENT_ID_PATTERN.test(environmentId)) {
    query.set("env", environmentId);
  }

  const url = `${vslabOrigin()}/api/similar?${query.toString()}`;

  let res: Response;

  try {
    res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      // cache を明示しないと revalidate が効かない(理由は utils/coreApi.ts)
      cache: "force-cache",
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    console.warn(`failed to fetch similar decks from vslab: ${url}`, error);

    return { status: "unavailable" };
  }

  if (res.status === 404) return { status: "not_found" };
  if (res.status === 400) return { status: "invalid" };
  if (res.status === 422) return { status: "unreadable" };

  if (!res.ok) {
    console.warn(`vslab responded ${res.status}: ${url}`);

    return { status: "unavailable" };
  }

  const body: unknown = await res.json().catch(() => null);
  const data = parseSimilarDecksResponse(body);

  if (!data) {
    console.warn(`vslab responded an unexpected body: ${url}`);

    return { status: "unavailable" };
  }

  return { status: "ok", data };
}
