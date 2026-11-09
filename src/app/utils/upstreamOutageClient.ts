/*
 * ブラウザ側の「アップデート中」の状態(覆いを出しているか)。全体の流れは utils/upstreamOutage.ts。
 *
 *   立てる … installUpstreamOutageWatch() が差し込んだ fetch が BFF の応答を見て立てる。
 *            error.tsx も、サーバコンポーネントが上流に届かず落ちたときに立てる
 *   下ろす … 覆い(components/organisms/Layout/UpdateOverlay.tsx)が復旧を確かめてから下ろし、
 *            onUpstreamRecovered の購読者(error.tsx)に知らせる
 *
 * 状態は1つだけ持ち、通信は checkUpstream()(覆いと error.tsx が呼ぶ)だけがする。
 */
import {
  UPSTREAM_STATUS_PATH,
  UPSTREAM_UNAVAILABLE_HEADER,
  isProxyOutageResponse,
} from "@app/utils/upstreamOutage";

/*
 * 何が止まっていたか。
 *   core   … core-apiserver(BFF がアップデート中のヘッダを返した / サーバコンポーネントが落ちた)
 *   webapp … webapp 自体(/api/ への取得に nginx の HTML の 502/503/504 が返った)
 */
export type UpstreamOutageCause = "core" | "webapp";

/** 覆いが読む形。null なら届いている(覆わない) */
export type UpstreamOutage = {
  /** 復旧の確認を送っている最中か */
  readonly checking: boolean;
  /*
   * webapp が止まっていたか(一度でも webapp 由来の信号を受けたら true のまま)。
   *
   * webapp が入れ替わると、ブラウザが持っているビルドとサーバのビルドが変わる。
   * その状態で router.refresh() すると、Next はビルドの食い違いを見てページ全体を読み込み直す
   * (next/dist/client/components/router-reducer/fetch-server-response.js の doMpaNavigation)。
   * 入力中の内容が消えるので、覆いはこのとき refresh しない。
   */
  readonly webappRestarted: boolean;
};

let outage: UpstreamOutage | null = null;
const listeners = new Set<() => void>();
const recoveredListeners = new Set<(webappRestarted: boolean) => void>();

function set(next: UpstreamOutage | null) {
  // 同じ中身なら差し替えない。useSyncExternalStore はスナップショットを参照で比べるので、
  // 作り直すと購読者が無駄に再描画される
  if (next === outage) return;
  if (
    next &&
    outage &&
    next.checking === outage.checking &&
    next.webappRestarted === outage.webappRestarted
  ) {
    return;
  }
  outage = next;
  listeners.forEach((l) => l());
}

/** 届かないと分かった。既に立っていれば、原因だけを足す */
export function enterUpstreamOutage(cause: UpstreamOutageCause): void {
  const webappRestarted = (outage?.webappRestarted ?? false) || cause === "webapp";
  set({ checking: outage?.checking ?? false, webappRestarted });
}

/** 復旧した。購読者に知らせる */
export function leaveUpstreamOutage(): void {
  if (outage === null) return;
  const { webappRestarted } = outage;
  set(null);
  recoveredListeners.forEach((l) => l(webappRestarted));
}

export function setUpstreamOutageChecking(checking: boolean): void {
  if (outage !== null) set({ ...outage, checking });
}

export function subscribeUpstreamOutage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getUpstreamOutageSnapshot(): UpstreamOutage | null {
  return outage;
}

/** サーバでは常に届いている扱い(覆いを描かない) */
export function getUpstreamOutageServerSnapshot(): UpstreamOutage | null {
  return null;
}

/** 覆いを下ろしたときに呼ばれる(webapp が入れ替わっていたかを渡す)。戻り値で購読をやめる */
export function onUpstreamRecovered(listener: (webappRestarted: boolean) => void): () => void {
  recoveredListeners.add(listener);
  return () => {
    recoveredListeners.delete(listener);
  };
}

/** 1回の確認を諦めるまでの時間。確認の間隔(3秒)より短くして重ならないようにする */
const CHECK_TIMEOUT_MS = 2_500;

/*
 * maintenance.html(proxy リポジトリ)にしか無い目印。計画メンテナンス中は nginx が
 * どのパスにもこれを 503 で返す。deploying.html とはステータスも content-type も同じなので、
 * 中身で見分けるしかない。maintenance.html のこのクラス名を変えたらここも変えること。
 */
const MAINTENANCE_MARKER = "maintenance-container";

/*
 * 1回確かめた結果。
 *   ok          … 届いている
 *   unavailable … 503 などの応答が返った(BFF の「届かない」、webapp の入れ替え中の deploying.html)
 *   maintenance … 計画メンテナンス中(maintenance.html が返った)
 *   unreachable … 応答そのものが返らなかった(利用者の回線・時間切れ)。止まっている証拠にはならない
 */
export type UpstreamCheckResult = "ok" | "unavailable" | "maintenance" | "unreachable";

/*
 * 届くかどうかを1回だけ確かめる。
 *
 * 5xx 以外は届いている扱いにする(4xx など想定外のときも)。覆いを外せなくなるより、外して
 * 個々の画面のエラー表示に任せたほうがましなため。
 */
export async function checkUpstream(): Promise<UpstreamCheckResult> {
  let res: Response;
  try {
    res = await originalFetch()(UPSTREAM_STATUS_PATH, {
      cache: "no-store",
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
  } catch {
    return "unreachable";
  }
  if (res.status < 500) return "ok";
  if (isProxyOutageResponse(res)) {
    const text = await res.text().catch(() => "");
    if (text.includes(MAINTENANCE_MARKER)) return "maintenance";
  }
  return "unavailable";
}

/*
 * ---- fetch の見張り ----
 *
 * BFF を呼ぶ箇所は 70 ファイルを超え、SWR を使うものも素の fetch のものもある。全部に
 * 判定を書き足す代わりに、window.fetch を1か所で包んで応答だけを覗く。
 * 包むだけで、リクエストも応答も一切変えない(本文も読まない。ヘッダとステータスだけ見る)。
 *
 * 覆いを出すのは同じオリジンの /api/ への応答のうち:
 *   - BFF が UPSTREAM_UNAVAILABLE_HEADER を付けて返したもの(core-apiserver の入れ替え中)
 *   - nginx の HTML の 502/503/504(webapp の入れ替え中で、BFF に届かなかった)
 *     計画メンテナンスの maintenance.html もここに当たるが、覆いの最初の確認で見分けて
 *     ページを読み込み直し、nginx のメンテナンス画面を出す(UpdateOverlay.tsx)
 * ページ遷移の RSC の取得(/api/ 以外)は見ない。そちらは Next が丸ごと読み込み直し、
 * nginx の deploying.html がそのまま出る。
 */

type FetchFn = typeof window.fetch;

type ResponseLike = {
  status: number;
  headers?: { get(name: string): string | null } | null;
};

const ORIGINAL_FETCH_KEY = "__vsrecorderOriginalFetch";
const ON_RESPONSE_KEY = "__vsrecorderOnFetchResponse";

type WatchedWindow = Window & {
  [ORIGINAL_FETCH_KEY]?: FetchFn;
  [ON_RESPONSE_KEY]?: (input: RequestInfo | URL, res: Response) => void;
};

/** 包む前の fetch。確認の通信はこれで送り、自分の見張りに引っかからないようにする */
function originalFetch(): FetchFn {
  const w = window as WatchedWindow;
  return w[ORIGINAL_FETCH_KEY] ?? window.fetch.bind(window);
}

function requestUrl(input: RequestInfo | URL): URL | null {
  try {
    const raw = typeof input === "string" || input instanceof URL ? input : input.url;
    return new URL(raw, window.location.href);
  } catch {
    return null;
  }
}

/** この応答を見て覆いを出すべきか。出すなら何が止まっていたかを返す */
export function upstreamOutageSignal(
  url: URL | null,
  res: ResponseLike,
  pageOrigin: string,
): UpstreamOutageCause | null {
  if (!url || url.origin !== pageOrigin) return null;
  if (!url.pathname.startsWith("/api/")) return null;
  // 確認の口そのものは覆いが自分で見る(ここで立てると、外した直後にまた立ちうる)
  if (url.pathname === UPSTREAM_STATUS_PATH) return null;
  if (res.headers?.get?.(UPSTREAM_UNAVAILABLE_HEADER)) return "core";
  if (isProxyOutageResponse(res)) return "webapp";
  return null;
}

/*
 * window.fetch を包む。包むのは1回だけ。
 *
 * 包んだ fetch は応答の判定を window 上の関数(ON_RESPONSE_KEY)経由で呼び、その関数は
 * このモジュールが読まれるたびに差し替える。包んだ fetch がモジュールの関数を直接握っていると、
 * 開発中に HMR でこのモジュールが読み直されたとき、古いモジュールの状態を立て続け、
 * 新しいモジュールを購読している覆いが出なくなる。
 */
export function installUpstreamOutageWatch(): void {
  if (typeof window === "undefined") return;
  const w = window as WatchedWindow;

  w[ON_RESPONSE_KEY] = (input, res) => {
    const cause = upstreamOutageSignal(requestUrl(input), res, window.location.origin);
    if (cause) enterUpstreamOutage(cause);
  };

  if (w[ORIGINAL_FETCH_KEY]) return;

  const original = window.fetch.bind(window);
  w[ORIGINAL_FETCH_KEY] = original;

  window.fetch = async function watchedFetch(input: RequestInfo | URL, init?: RequestInit) {
    const res = await original(input, init);
    try {
      w[ON_RESPONSE_KEY]?.(input, res);
    } catch {
      // 見張りの失敗で本来の通信を壊さない
    }
    return res;
  };
}
