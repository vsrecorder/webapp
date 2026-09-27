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

// 環境付きの照会(索引に無いデッキ)で vslab が 1 回に受け付ける件数(vslab の MAX_LIST_CODES と同じ)
const LIST_CODES_PER_REQUEST = 20;

/*
 * Data Cache に置く時間。vslab 側のキャッシュ(10 分、取り込みバッチの完了通知で捨てる)と同じ。
 * 定義の更新を追いたいので日単位にはしない。個別ページは大会ごとに 1 本、一覧は 1 日ぶんで
 * 数本なので、この間隔でも vslab への往復はわずか。
 */
const REVALIDATE_SECONDS = 600;

/*
 * vslab が応答しないときにページを止めない上限。通常は数十 ms で返る。
 *
 * 一覧(/cityleague_results)は 1 ページ目のデータを待ってから HTML を返し、個別ページも本文を
 * カード内訳と一緒に待つので、ここがそのまま表示の遅れの上限になる。3 秒で諦めて種類の行なしで出す
 */
const TIMEOUT_MS = 3000;

function vslabOrigin(): string {
  return process.env.VSLAB_ORIGIN || DEFAULT_VSLAB_ORIGIN;
}

/*
 * 索引に無いデッキ(大型大会)の照会を Data Cache に置く時間。
 *
 * この照会は vslab が 1 件ずつ上流からデッキの中身を取り寄せるため、一部だけ取れない応答
 * (notFound 混じりの 200)が返ることがある。10 分置くとその欠けが 10 分残るので短くする。
 * 中身は vslab 側が 1 日置いていて判定も軽いので、1 分ごとに引き直しても vslab の負担は小さい。
 */
const LIST_REVALIDATE_SECONDS = 60;

async function fetchClassify(query: string, revalidate = REVALIDATE_SECONDS): Promise<DeckArchetypeMap> {
  const url = `${vslabOrigin()}/api/archetypes/classify?${query}`;

  let res: Response;

  try {
    res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      // cache を明示しないと revalidate が効かない(理由は utils/coreApi.ts)
      cache: "force-cache",
      next: { revalidate },
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
export async function getDeckArchetypesByCodes(
  codes: string[],
  context?: DeckArchetypeContext,
): Promise<DeckArchetypeMap> {
  // 環境付きの照会は vslab 側の 1 回の上限が 20 件(1 件ずつ上流へ取りに行くため)。
  // 呼び出し側はイベント(区分×日)ごとに引くので、入賞 16 件で収まる
  const chunks = chunkDeckCodes(normalizeDeckCodes(codes), context ? LIST_CODES_PER_REQUEST : undefined);

  if (chunks.length === 0) return {};

  // 大会の環境と日付を添えると、vslab の索引に無いデッキ(大型大会の入賞など)も
  // vslab がデッキの中身を取り寄せて同じ規則で判定する
  const contextQuery = context
    ? `&environment=${encodeURIComponent(context.environmentId)}&date=${encodeURIComponent(context.date)}`
    : "";

  const maps = await Promise.all(
    chunks.map((chunk) =>
      fetchClassify(
        `codes=${encodeURIComponent(chunk.join(","))}${contextQuery}`,
        context ? LIST_REVALIDATE_SECONDS : REVALIDATE_SECONDS,
      ),
    ),
  );

  return Object.assign({}, ...maps);
}

/*
 * 索引に無いデッキを判定するときの大会の文脈。デッキの種類は環境と日付で変わりうるため
 * (定義に適用期間がある)、どの大会のデッキかを vslab に伝える。
 */
export type DeckArchetypeContext = {
  // 対戦環境の ID(official_events.environment_id。例 "m6a")
  environmentId: string;
  // 大会の開催日 "YYYY-MM-DD"(JST)
  date: string;
};
