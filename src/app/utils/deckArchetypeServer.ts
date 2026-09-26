import { DeckArchetypeMap } from "@app/types/deck_archetype";
import {
  chunkDeckCodes,
  normalizeDeckCodes,
  parseDeckArchetypeResponse,
} from "@app/utils/deckArchetype";

/*
 * 入賞デッキの種類(デッキ分類)を、バトラボ(vslab)からサーバ側で取得する。
 *
 * 判定は vslab のデッキ分類ルール(vslab/src/data/archetypes.json)で行われ、こちらは
 * 結果を受け取って表示するだけ。ルールを持たないので、vslab 側で定義を直せば
 * 次の照会からこちらの表示も新しい種類になる。
 *
 * ブラウザから直接 vslab を引く作りにはしない(CORS は空いている)。サーバで取れば
 *   - 個別ページの HTML に種類の名前が載る(検索エンジンが読める)
 *   - 同じ照会が Data Cache に載り、見る人が増えても vslab への往復は増えない
 *   - CSP の connect-src を広げずに済む
 * ため。一覧の続きのようにブラウザ側で要るときは BFF(/api/cityleague_results/deck_archetypes)を通す。
 *
 * 取れなければ空の辞書を返す。種類は本文の付随物なので、vslab が落ちていても
 * ページ自体はこれまでどおり出す(画像とデッキコードだけの表示になる)。
 */

// vslab の公開オリジン。開発機ではローカルの vslab(http://localhost:6757)を VSLAB_ORIGIN で指す
const DEFAULT_VSLAB_ORIGIN = "https://lab.vsrecorder.mobi";

/*
 * Data Cache に置く時間。vslab 側のキャッシュ(10 分、取り込みバッチの完了通知で捨てる)と同じ。
 * 定義の更新を追いたいので日単位にはしない。個別ページは大会ごとに 1 本、一覧は 1 日ぶんで
 * 数本なので、この間隔でも vslab への往復はわずか。
 */
const REVALIDATE_SECONDS = 600;

// vslab が応答しないときにページを止めない上限。通常は数十 ms で返る
const TIMEOUT_MS = 5000;

function vslabOrigin(): string {
  return process.env.VSLAB_ORIGIN || DEFAULT_VSLAB_ORIGIN;
}

async function fetchClassify(query: string): Promise<DeckArchetypeMap> {
  const url = `${vslabOrigin()}/api/archetypes/classify?${query}`;

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
    console.warn(`failed to fetch deck archetypes from vslab: ${url}`, error);

    return {};
  }

  // 404 は「その大会(コード)が vslab の索引に無い」。取り込みの遅れや提供範囲外で
  // 普通に起きるので、失敗としては扱わない
  if (res.status === 404) return {};

  if (!res.ok) {
    console.warn(`vslab responded ${res.status}: ${url}`);

    return {};
  }

  const body: unknown = await res.json().catch(() => null);

  return parseDeckArchetypeResponse(body);
}

// 大会(official_event_id)の入賞デッキをまとめて引く(個別ページ向け)
export async function getDeckArchetypesByEvent(
  officialEventId: number,
): Promise<DeckArchetypeMap> {
  if (!Number.isInteger(officialEventId) || officialEventId <= 0) return {};

  return fetchClassify(`event=${officialEventId}`);
}

/*
 * デッキコードで引く(一覧向け。大会をまたいで 1 ページぶんをまとめる)。
 *
 * vslab の上限(100 件)ごとに分けて並列に引き、1 つの辞書にまとめる。
 * 並びを揃えてから分けるので、同じ 1 日ぶんなら塊の切れ目も同じになる(キャッシュが当たる)。
 */
export async function getDeckArchetypesByCodes(codes: string[]): Promise<DeckArchetypeMap> {
  const chunks = chunkDeckCodes(normalizeDeckCodes(codes));

  if (chunks.length === 0) return {};

  const maps = await Promise.all(
    chunks.map((chunk) => fetchClassify(`codes=${encodeURIComponent(chunk.join(","))}`)),
  );

  return Object.assign({}, ...maps);
}
