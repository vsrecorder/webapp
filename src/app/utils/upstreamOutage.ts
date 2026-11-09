/*
 * 「core-apiserver に届かない(アップデート中)」をどう表すか。サーバとブラウザの両方が使う。
 *
 * nginx のアップデート中の画面(proxy リポジトリの deploying.html)は、nginx から webapp に
 * 繋がらないときにしか出ない。core-apiserver を入れ替えている間は webapp が動いていて
 * ページは返るので、nginx からは何も見えない。そこで webapp 側で次のように受け持つ。
 *
 *   サーバ(utils/coreApiFetch.ts)… 上流に繋がらなければ数秒つなぎ直す。入れ替えは
 *       たいてい数秒で終わるので、ほとんどはここで利用者に見えないまま済む
 *   BFF(utils/upstream.ts)        … それでも駄目なら 503 + UPSTREAM_UNAVAILABLE_HEADER を返す
 *   サーバコンポーネント            … UPSTREAM_UNAVAILABLE_DIGEST 付きの例外を投げ、error.tsx が受ける
 *   ブラウザ(UpdateOverlay.tsx)    … 上の2つ、または nginx が返した HTML の 502/503/504 を見て
 *       アップデート中の覆いを出し、復旧を確かめて外す
 *
 * webapp を入れ替えている間に、開いていた画面から BFF へ取りに行った場合も
 * nginx の deploying.html(HTML の 503)が返るので、同じ覆いが出る。
 *
 * このファイルは通信も状態も持たない(ブラウザから import しても Node 専用の物を引き込まない)。
 */

/** BFF が「上流に届かない」ときに付けるヘッダ。ブラウザはこれを見て覆いを出す */
export const UPSTREAM_UNAVAILABLE_HEADER = "x-vsrecorder-upstream-unavailable";

/** BFF が返す本文の code */
export const UPSTREAM_UNAVAILABLE_CODE = "UPSTREAM_UNAVAILABLE";

/*
 * サーバコンポーネントで投げる例外の digest。
 *
 * 本番ビルドでは、サーバコンポーネントの例外は message が伏せられて error.tsx に届くが、
 * 例外に digest が付いていればそれは書き換えずに渡される
 * (next/dist/server/app-render/create-error-handler.js の「err.digest があれば尊重する」)。
 * 先頭を NEXT_ にしないこと(Next が自分の制御用の例外と見なす)。
 */
export const UPSTREAM_UNAVAILABLE_DIGEST = "VSRECORDER_UPSTREAM_UNAVAILABLE";

/** 書き込みが失敗したときなどに利用者へ見せる文言(deploying.html と揃える) */
export const UPSTREAM_UNAVAILABLE_MESSAGE =
  "ただいまアップデート中です。少し待ってからもう一度お試しください";

/** 復旧を確かめる口(app/api/upstream_status/route.ts) */
export const UPSTREAM_STATUS_PATH = "/api/upstream_status";

/*
 * nginx が /api/v1beta 配下のうち core-apiserver 以外へ振り分けている経路
 * (proxy リポジトリの sites-enabled/vsrecorder.mobi の location)。
 *
 * これらが落ちていても core-apiserver は動いているので、アップデート中の覆いは出さない。
 * 覆いの復旧確認は core-apiserver を見るので、出すと「出る → 3 秒で外れる → SWR の取り直しで
 * また出る」を繰り返し、画面が操作できなくなる。deckcard-api は CI が無く単独で入れ替えることがある。
 * nginx の振り分けを足したらここも足すこと。
 */
const NON_CORE_API_PREFIXES = ["/api/v1beta/deckcards", "/api/v1beta/pokemon-sprites"];

/** core-apiserver へ行く上流の URL か(BFF がアップデート中として扱ってよいか) */
export function isCoreApiUrl(url: string): boolean {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return false;
  }
  if (!pathname.startsWith("/api/v1beta/")) return false;
  return !NON_CORE_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** nginx が上流に繋がらないときに返すステータス(deploying.html は 502/504 を 503 にして返す) */
const OUTAGE_STATUSES = new Set([502, 503, 504]);

type ResponseLike = {
  status: number;
  headers?: { get(name: string): string | null } | null;
};

/*
 * nginx が「上流に繋がらない」と答えた応答か。
 *
 * 上流(core-apiserver・webapp)はどちらも JSON か Next のページを返し、nginx 自身が返す
 * deploying.html は text/html。ステータスだけで見ると、core-apiserver が自分で返した
 * 503(JSON)まで同じに見えてしまうので、content-type が HTML だと分かるときだけに絞る。
 * content-type が無い・読めないときは「分からない」として false にする。
 *
 * 手動メンテナンス(maintenance.html の 503)も HTML だが、そのとき webapp→core-apiserver の
 * 経路は nginx の許可リストで素通りになる(proxy の sites-enabled の $maintenance)ため、ここには来ない。
 */
export function isProxyOutageResponse(res: ResponseLike): boolean {
  if (!OUTAGE_STATUSES.has(res.status)) return false;
  const contentType = res.headers?.get?.("content-type") ?? "";
  return contentType.toLowerCase().startsWith("text/html");
}
