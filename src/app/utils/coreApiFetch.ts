/*
 * サーバ(BFF・サーバコンポーネント)から core-apiserver を呼ぶ fetch。
 *
 * **core-apiserver の入れ替え中(make deploy)の数秒を、利用者に見せずにやり過ごす**ためのもの。
 * コンテナを作り直す間は core-apiserver に繋がらず、本番(公開ドメイン経由)では nginx が
 * deploying.html(HTML の 503)を、直接つなぐ構成(VSRECORDER_UPSTREAM_ORIGIN)では
 * 接続拒否を返す。Go のサーバは止まるのも立ち上がるのも速く、空白はたいてい数秒なので、
 * その間だけ待って繋ぎ直せば画面からは何も起きなかったように見える
 * (2026-11-10 07:31 の入れ替えでは、nginx のログに 5xx が1件も残らなかった)。
 * 待っても繋がらなければ、呼び出し側がアップデート中として扱う(utils/upstreamOutage.ts)。
 *
 * ■ 繋ぎ直してよいのは、**送り直しても結果が変わらないときだけ**
 * 記録の作成のような書き込みを、届いたかもしれないのに送り直すと二重に処理される。
 *
 *   nginx の HTML の 502/503/504 → nginx は上流に送れたかどうかを区別して返さない。
 *                                   **GET / HEAD だけ**繋ぎ直す
 *   接続の前で失敗した(接続拒否・名前解決の失敗など) → 送ってすらいないので、どのメソッドでも繋ぎ直す
 *   接続のあとで切れた → 届いたかもしれない。GET / HEAD だけ繋ぎ直す
 *   それ以外(時間切れ・中断・本番書き込みの遮断など) → 繋ぎ直さず、そのまま投げる
 *
 * ■ 待つのは「届かなくなってから」CORE_API_RETRY_WINDOW_MS まで(プロセス内で共有)
 * 1回ごとに数秒待つと、上流を何度も呼ぶページは待ちが積み重なる。届かなくなった時刻を
 * 覚えておき、そこから時間が過ぎたあとの呼び出しは待たずに失敗させる。
 * pm2 の各プロセスが別々に持つが、それで困ることはない。
 *
 * 忘れるのは次のどちらか:
 *   - 上流から実際に応答が返った。ただし **Next のデータキャッシュから返り得る取得
 *     (force-cache / next.revalidate)の成功は数えない**。止まっている間もキャッシュから 200 が
 *     返るので、それで忘れると、ページを開くたびにまた 5 秒待つことになる(本番ビルドで確認した)
 *   - 最後に届かなかったときから OUTAGE_GAP_MS 過ぎた。キャッシュから返る取得しか来ない間は
 *     上の条件で忘れられないので、これが無いと、後日の別のデプロイで繋ぎ直しが効かなくなる
 *
 * auth.ts の退会確認はここを通さない。時間切れつきのフェイルオープンで、
 * 待たせるとページの表示そのものが遅れるため(use-up の apps/web/src/lib/api-fetch.ts と同じ判断)。
 */
import {
  UPSTREAM_UNAVAILABLE_DIGEST,
  isProxyOutageResponse,
} from "@app/utils/upstreamOutage";

/** 届かなくなってから繋ぎ直しを続ける時間。入れ替えにかかる時間(数秒)より少し長くとる */
export const CORE_API_RETRY_WINDOW_MS = 5_000;

/** 繋ぎ直しの間隔 */
export const CORE_API_RETRY_INTERVAL_MS = 500;

/** 最後に届かなかったときからこれだけ過ぎたら、次に届かなかったときは新しい停止として数え直す */
export const CORE_API_OUTAGE_GAP_MS = 10_000;

/** 送る前に失敗した(= 上流に届いていない)ことを表すエラーコード */
const NOT_SENT_CODES = new Set([
  "ECONNREFUSED", // 待ち受けていない(停止〜起動の間)
  "ENOTFOUND", // docker の名前が引けない(コンテナを作り直している間)
  "EAI_AGAIN", // 名前解決の一時的な失敗
  "EHOSTUNREACH",
  "ENETUNREACH",
  "UND_ERR_CONNECT_TIMEOUT",
]);

/** 送ったあとに切れた(= 届いたかもしれない)ことを表すエラーコード */
const AFTER_SENT_CODES = new Set(["ECONNRESET", "EPIPE", "UND_ERR_SOCKET"]);

/** 何度送っても結果が変わらないメソッド */
const SAFE_METHODS = new Set(["GET", "HEAD"]);

/*
 * core-apiserver に届かなかった。
 *
 * digest を付けてあるので、サーバコンポーネントで投げると本番でも error.tsx がこれと分かり、
 * アップデート中の覆いを出す(utils/upstreamOutage.ts の UPSTREAM_UNAVAILABLE_DIGEST)。
 */
export class UpstreamUnavailableError extends Error {
  readonly digest = UPSTREAM_UNAVAILABLE_DIGEST;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "UpstreamUnavailableError";
  }
}

/*
 * fetch の失敗からエラーコードを取り出す。Node の fetch(undici)は
 * TypeError("fetch failed") の cause に元のエラーを入れる。IPv4 / IPv6 を両方試したときは
 * AggregateError になり、個々のコードは errors に入る。
 */
function errorCodes(e: unknown): string[] {
  const cause = (e as { cause?: unknown } | null)?.cause as
    | { code?: unknown; errors?: unknown }
    | undefined;
  if (!cause) return [];
  const codes: string[] = [];
  if (typeof cause.code === "string") codes.push(cause.code);
  if (Array.isArray(cause.errors)) {
    for (const inner of cause.errors) {
      const code = (inner as { code?: unknown } | null)?.code;
      if (typeof code === "string") codes.push(code);
    }
  }
  return codes;
}

/** 接続できなかった・切れた失敗か(どちらも「上流が止まっている」とみなす) */
export function isUnreachableError(e: unknown): boolean {
  const codes = errorCodes(e);
  return (
    codes.length > 0 && codes.every((c) => NOT_SENT_CODES.has(c) || AFTER_SENT_CODES.has(c))
  );
}

/** この失敗のあとに繋ぎ直してよいか(冒頭の表) */
function isRetryableError(e: unknown, method: string): boolean {
  const codes = errorCodes(e);
  if (codes.length === 0) return false;
  if (codes.every((c) => NOT_SENT_CODES.has(c))) return true;
  return SAFE_METHODS.has(method) && isUnreachableError(e);
}

/*
 * 届かなくなった時刻(since)と、最後に届かなかった時刻(last)。届いている間は null。
 *
 * モジュールの変数ではなく globalThis に置く。Next はページ(RSC)と route handler を別の層として
 * 束ねるので、このモジュールも層ごとに別の実体になる(開発サーバではルートごとに別になる)。
 * モジュールの変数だと、ページが待ち切ったあとに BFF がまた 5 秒待つ、が起きる(実際に確認した)。
 */
const OUTAGE_KEY = Symbol.for("vsrecorder.coreApiOutageSince");

type OutageState = { since: number; last: number };

type OutageHolder = { [OUTAGE_KEY]?: OutageState | null };

function getOutage(): OutageState | null {
  return (globalThis as OutageHolder)[OUTAGE_KEY] ?? null;
}

function setOutage(value: OutageState | null): void {
  (globalThis as OutageHolder)[OUTAGE_KEY] = value;
}

/** テスト用。覚えている「届かなくなった時刻」を忘れる */
export function resetCoreApiOutageForTest(): void {
  setOutage(null);
}

/*
 * Next のデータキャッシュから返り得る取得か。
 *
 * force-cache か、正の next.revalidate を指定したものはキャッシュに入りうる(入っていれば上流へ行かない)。
 * 指定の無い取得・no-store は、ルートが動的(このアプリは全ルート)なら毎回上流へ行く。
 */
function mayBeServedFromCache(init: RequestInit): boolean {
  if (init.cache === "no-store") return false;
  if (init.cache === "force-cache") return true;
  const revalidate = (init as { next?: { revalidate?: unknown } }).next?.revalidate;
  return typeof revalidate === "number" && revalidate > 0;
}

type RetryOptions = {
  windowMs?: number;
  intervalMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** ログ用。クエリには利用者の条件が入るので落とす */
function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/*
 * core-apiserver を呼ぶ。届かなければ繋ぎ直し(冒頭の表)、それでも駄目なら:
 *   - 応答があった(nginx の HTML の 503 など)ときは、**その応答をそのまま返す**。
 *     呼び出し側の従来の失敗の扱いがそのまま効く(UpstreamError の isUnavailable で見分けられる)
 *   - 接続できなかったときは UpstreamUnavailableError を投げる
 *
 * 応答が JSON で返ってきたら(5xx でも)送り直さない。それは core-apiserver の判断なので。
 * 本文は文字列か ArrayBuffer にしておくこと(繋ぎ直すたびに同じものを送るため)。
 */
export async function fetchCoreApi(
  url: string,
  init: RequestInit = {},
  options: RetryOptions = {},
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const windowMs = options.windowMs ?? CORE_API_RETRY_WINDOW_MS;
  const intervalMs = options.intervalMs ?? CORE_API_RETRY_INTERVAL_MS;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 1; ; attempt++) {
    let res: Response | undefined;
    let error: unknown;
    // 2回目以降は新しい signal を付ける。サーバコンポーネントの中の fetch は、Next が同じリクエストの
    // 同じ GET をまとめていて(next/dist/server/lib/dedupe-fetch.js)、そのままだと送り直しても
    // 最初の失敗の複製が返るだけで上流に届かない。signal があるとまとめの対象から外れる。
    // 1回目に付けないのは、Header と Dashboard が同じ /users/{id} を引くようなまとめを残すため。
    const attemptInit =
      attempt === 1 || init.signal ? init : { ...init, signal: new AbortController().signal };
    try {
      res = await fetch(url, attemptInit);
    } catch (e) {
      error = e;
    }

    const unavailable = res ? isProxyOutageResponse(res) : isUnreachableError(error);

    if (!unavailable) {
      // 上流から応答が返ったと言えるときだけ忘れる(冒頭の「忘れるのは」)。
      // 例外(時間切れなど)は届いた証拠にならない
      if (res && !mayBeServedFromCache(init) && getOutage() !== null) {
        console.warn(`[core-api] 繋がるようになりました(${method} ${pathOf(url)})`);
        setOutage(null);
      }
      if (res) return res;
      throw error;
    }

    const t = now();
    const previous = getOutage();
    const startedAt =
      previous && t - previous.last <= CORE_API_OUTAGE_GAP_MS ? previous.since : t;
    setOutage({ since: startedAt, last: t });

    const retryable = res ? SAFE_METHODS.has(method) : isRetryableError(error, method);
    const withinWindow = t + intervalMs - startedAt <= windowMs;

    if (!retryable || !withinWindow) {
      if (attempt > 1 || !retryable) {
        console.warn(
          `[core-api] 繋がりません(${method} ${pathOf(url)}、${attempt} 回試行)`,
        );
      }
      if (res) return res;
      throw new UpstreamUnavailableError(`core-apiserver に繋がりません: ${method} ${pathOf(url)}`, {
        cause: error,
      });
    }

    // 読まない本文を捨てて接続を返す(捨てないと undici が接続を握ったままになる)。
    // **待たないこと。** Next がラップした fetch は応答を tee して片方をキャッシュ用に持つことがあり、
    // tee の片方の cancel() はもう片方も閉じられるまで解決しない。待つとここで止まる
    // (開発サーバで実際に 60 秒止まり、nginx の 504 になった)。
    void res?.body?.cancel().catch(() => {});
    await sleep(intervalMs);
  }
}
