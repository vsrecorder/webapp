import { NextResponse, type NextRequest } from "next/server";

// このファイルは2つの役目を持つ。
//
//   1. ログイン必須ページへの未認証アクセスを、描画に入る前に 307 で / へ返す
//   2. UTM付きリンクからの着地で、流入元を first-party Cookie に保存する(施策0-4)
//
// Next.js 16 では middleware.ts が proxy.ts に改名された。1プロジェクトに1ファイルしか
// 置けないため、両方をここに集約している(utm-attribution-plan.md §3.3 は middleware.ts を
// 新規に作る前提だが、このプロジェクトでは既存の proxy.ts に相乗りさせる)。

// ---------------------------------------------------------------------------
// 1. ログイン必須ページのガード
// ---------------------------------------------------------------------------
//
// 各ページは auth() の結果を見て redirect("/") を呼んでいるが、これらのルートには
// loading.tsx(Suspense 境界)があり、フォールバックを流し始めた時点で HTTP ヘッダが確定する。
// その後に呼ばれた redirect() はステータスを変えられず、200 + <meta http-equiv="refresh"> の
// 「ソフトリダイレクト」になる(2026-08-29 に本番で実測)。クローラにはサイト共通 title だけの
// 空ページに見え、GSC では「クロール済み - インデックス未登録」として積み上がっていた。
//
// ここではセッション Cookie の有無だけを見る。中身の検証はしない(JWT の検証は各ページの
// auth() が引き続き行う)。Cookie が無いのはクローラと未ログインの訪問者に共通で、
// 判定に I/O を伴わないため対象ルートの全リクエストに乗せても遅くならない。
//
// Cookie 名は next-auth の既定(auth.ts が useSecureCookies: true なので __Secure- 付き)。
// セッションが大きいと "<name>.0", "<name>.1" に分割されるため前方一致でも見る。
const SESSION_COOKIE_NAMES = ["__Secure-authjs.session-token", "authjs.session-token"];

// ログイン必須のルート。ページ側で auth() → redirect("/") しているものと同じ範囲。
// 以前は config.matcher でこの範囲だけを対象にしていたが、UTM の着地はトップページや
// /deck_meta など未ログインのページで起きるため、matcher は全ページに広げ、
// 「どこをガードするか」はこの配列で持つようにした。
const PROTECTED_PATHS = ["/decks", "/records", "/users", "/calendar"];

function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(({ name }) =>
      SESSION_COOKIE_NAMES.some((base) => name === base || name.startsWith(`${base}.`)),
    );
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

// ---------------------------------------------------------------------------
// 2. 流入元の保存(施策0-4 / utm-attribution-plan.md)
// ---------------------------------------------------------------------------
//
// X アナリティクスは「クリック」までしか見えず、自社DBは「登録以降」しか見えない。
// この2つを繋ぐために、着地時点の utm_* を Cookie に置き、登録の瞬間に
// core-apiserver へ送って user_acquisitions に永続化する(送信は auth.ts)。
//
// クライアントJSの document.cookie ではなくサーバー発行にしているのは、Safari ITP が
// スクリプト発行 Cookie を7日で失効させるため。登録はリーチの数週間後に起きるので、
// 7日で消えると遅延コンバージョンをまるごと取りこぼす。
const ATTRIBUTION_COOKIE_NAME = "vsr_attr";

// 登録はリーチの数週間後に発生するため、窓は長めに取る(付録B)。30日では足りない。
const ATTRIBUTION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

// 列長。core-apiserver の user_acquisitions に合わせる。
const MAX_LENGTH = {
  source: 32,
  medium: 32,
  campaign: 64,
  content: 64,
  referrer: 255,
  path: 255,
} as const;

// utm_* はクエリ文字列であり、誰でも任意の値を付けられる。無検証で Cookie に入れると
// 表記ゆれやゴミ値がそのまま集計軸になるため、この文字集合の外は捨てる。
const UTM_VALUE_PATTERN = /^[a-z0-9_-]+$/;

// campaign の allowlist(未知の値を "(other)" に丸める処理)は、ここではなく
// core-apiserver の entity.NormalizeAcquisitionCampaign に置いている。
// 投稿タイプを増やすときにフロントとサーバの両方を直さずに済むよう、
// 「どの分類を認めるか」はサーバ側の1箇所に集約する。
function cleanUtmValue(value: string | null, maxLength: number): string | null {
  if (!value) {
    return null;
  }

  const cleaned = value.toLowerCase().slice(0, maxLength);

  return UTM_VALUE_PATTERN.test(cleaned) ? cleaned : null;
}

// 自サイトのホスト名。サイト内の遷移をリファラとして拾わないために使う。
//
// nextUrl.hostname だけでは足りない。本番はリバースプロキシの背後で動いており、
// Next.js が見るホストは内部のもの(localhost 等)になりうる一方、リファラには
// 公開ホスト名(vsrecorder.mobi)が入る。両方を自分のホストとして扱わないと、
// サイト内の遷移がすべて「外部からの流入」として記録されてしまう。
function ownHostnames(request: NextRequest): string[] {
  const headerHost = (
    request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  )
    ?.split(",")[0]
    ?.trim()
    .split(":")[0]
    .toLowerCase();

  return [request.nextUrl.hostname.toLowerCase(), headerHost].filter(
    (host): host is string => !!host,
  );
}

// リファラはホスト名だけを残す。パス以降には検索語などが含まれうるため保存しない。
// 自サイト内の遷移(= 流入元ではない)も落とす。
function externalReferrerHost(request: NextRequest): string | null {
  const referer = request.headers.get("referer");
  if (!referer) {
    return null;
  }

  let host: string;
  try {
    host = new URL(referer).hostname.toLowerCase();
  } catch {
    return null;
  }

  if (!host || host.length > MAX_LENGTH.referrer) {
    return null;
  }

  return ownHostnames(request).includes(host) ? null : host;
}

// 着地の情報を Cookie に焼く。既に Cookie があれば触らない(初回タッチ優先)。
// X がほぼ唯一のチャネルであり、知りたいのは「最初に連れてきた投稿」であるため、
// 最終タッチではなく初回タッチを採る(付録B)。
function saveAttribution(request: NextRequest, response: NextResponse): NextResponse {
  if (request.cookies.get(ATTRIBUTION_COOKIE_NAME)) {
    return response;
  }

  // ログイン済みの訪問者はこれ以上「新規登録」を発生させないため、記録しても使われない
  if (hasSessionCookie(request)) {
    return response;
  }

  const { searchParams } = request.nextUrl;
  const source = cleanUtmValue(searchParams.get("utm_source"), MAX_LENGTH.source);
  const referrer = externalReferrerHost(request);

  // UTM が無くてもリファラがあれば残す。リンクを踏まず後日直接来る人が多く、
  // UTM 単独では判明率が上がらないため、リファラ推定(サーバ側)の材料を確保しておく。
  if (!source && !referrer) {
    return response;
  }

  const attribution = {
    source,
    medium: cleanUtmValue(searchParams.get("utm_medium"), MAX_LENGTH.medium),
    campaign: cleanUtmValue(searchParams.get("utm_campaign"), MAX_LENGTH.campaign),
    content: cleanUtmValue(searchParams.get("utm_content"), MAX_LENGTH.content),
    referrer,
    landing_path: request.nextUrl.pathname.slice(0, MAX_LENGTH.path),
    landing_at: new Date().toISOString(),
  };

  // 値は NextResponse.cookies.set が encodeURIComponent して書き出す
  // (JSON は , ; " を含み、素のままでは Cookie 値として壊れるため)。
  // ここで自前にエンコードすると二重エンコードになり、読み手(auth.ts)の
  // decodeURIComponent 1回では JSON に戻らなくなる。
  response.cookies.set(
    ATTRIBUTION_COOKIE_NAME,
    JSON.stringify(attribution),
    {
      maxAge: ATTRIBUTION_MAX_AGE_SECONDS,
      // handleSignIn(クライアント)から読んで signIn() に載せるため httpOnly にできない。
      // 秘匿情報は入らず、値は上記で正規化済みなので読まれても実害はない。
      // 裏を返すとこの Cookie は改ざん可能であり、計測用途に限って使う。
      httpOnly: false,
      sameSite: "lax",
      secure: true,
      path: "/",
    },
  );

  return response;
}

export function proxy(request: NextRequest) {
  if (isProtectedPath(request.nextUrl.pathname) && !hasSessionCookie(request)) {
    // ページ側の redirect("/") と同じ行き先。ホストはリクエストのものをそのまま使う。
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";

    // リダイレクトでも Set-Cookie は届く。UTM付きリンクがログイン必須ページを
    // 指していた場合(例: /records/quick)に流入元を落とさないよう、ここでも記録する。
    return saveAttribution(request, NextResponse.redirect(url, 307));
  }

  return saveAttribution(request, NextResponse.next());
}

export const config = {
  // 全ページを対象にする(UTM の着地はトップページなど未ログインのページで起きる)。
  // API ルート・Next.js の内部アセット・拡張子付きのファイル(sitemap.xml など)は除く。
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
