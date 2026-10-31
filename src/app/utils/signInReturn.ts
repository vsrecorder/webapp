/*
 * ログインが要るページに未ログインで来た人を、ログイン後に元のページへ戻す。
 *
 * 会員向けのページは未ログインだとトップへ飛ばす(proxy.ts と各ページ)。これまでは行き先を捨てていたので、
 * ログインし直してもトップに着いてしまい、push 通知のタップ計測(?pd=)も落ちていた
 * (セッションは14日で切れるため、しばらく来ていない人ほどこの経路を通る)。
 * そこでトップへは `/?next=<元のパスとクエリ>` で飛ばし、ログインボタンはこれを戻り先に使う。
 *
 * このファイルは proxy.ts からも読むので、next/navigation などに依存させない
 * (ページから飛ばすときの redirect は signInReturnServer.ts)。
 *
 * next は外から自由に書ける値なので、同じサイト内のパスだけを受け付ける
 * (`//evil.example` や `https://...` を通すと、ログイン後に外部サイトへ飛ばせてしまう)。
 */

export const SIGN_IN_NEXT_PARAM = "next";

// 戻り先の長さの上限。超えたものは捨てて、ただのトップへ飛ばす(従来の動き)。
// next は Location にもう一度エンコードして載るので、最大で3倍に膨らむ。さらに正規化で
// 非ASCIIの文字は1文字が9文字(%E3%81%82)になる。上限が無いと、細工した長いリンクで
// Location が本番 nginx の proxy_buffer_size(16k)を超え、開いた人に 502 が出る。
// 実際の戻り先(push のリンクなど)は100文字にも満たない
const MAX_NEXT_LENGTH = 1024;

// 同一オリジンかどうかを判定するためだけの仮の起点。実際のドメインには依存しない
const PROBE_ORIGIN = "https://probe.invalid";

// ページが受け取る searchParams(解決後)の形。戻り先のクエリを組み立てるのに使う
export type SearchParams = Record<string, string | string[] | undefined>;

/*
 * 戻り先として使ってよいパス(パス＋クエリ)を返す。使えないときは null。
 * トップ自体は戻り先にしない(ログイン後はもともとトップに着くので意味が無い)。
 */
export function parseNextPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_NEXT_LENGTH) {
    return null;
  }

  // `//host` と `/\host` はブラウザがプロトコル相対URLとして別ホストへ解決する
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(value, PROBE_ORIGIN);
  } catch {
    return null;
  }

  if (url.origin !== PROBE_ORIGIN || url.pathname === "/") {
    return null;
  }

  // 正規化した後の形でもう一度見る。`/.//evil.example` や `/a/..//evil.example` は
  // 上の判定を通るが、ドットの区間が畳まれて `//evil.example` になる。
  // これを Location に載せると、ブラウザは別ホストへ移動してしまう
  const path = url.pathname + url.search;
  if (path.startsWith("//") || path.length > MAX_NEXT_LENGTH) {
    return null;
  }

  return path;
}

// トップへ飛ばすときのクエリ(`next=...`、先頭の ? は付けない)。戻り先にできなければ空
export function signInQuery(pathWithQuery: string): string {
  const next = parseNextPath(pathWithQuery);

  return next ? `${SIGN_IN_NEXT_PARAM}=${encodeURIComponent(next)}` : "";
}

// `/?next=...` を組み立てる。searchParams はページが受け取ったものをそのまま渡す
export function buildSignInUrl(pathname: string, searchParams?: SearchParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) {
      query.append(key, v);
    }
  }

  const search = query.toString();
  const signIn = signInQuery(search ? `${pathname}?${search}` : pathname);

  return signIn ? `/?${signIn}` : "/";
}

/*
 * ログインボタンが使う戻り先。今の URL に有効な next があればそれを、無ければ今いるパスを返す。
 * search は `window.location.search` を渡す(押した時点で読むので useSearchParams は要らない)。
 */
export function resolveSignInReturnPath(pathname: string, search: string): string {
  const next = parseNextPath(new URLSearchParams(search).get(SIGN_IN_NEXT_PARAM));

  return next ?? pathname;
}
