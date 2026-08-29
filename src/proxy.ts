import { NextResponse, type NextRequest } from "next/server";

// ログイン必須ページへの未認証アクセスを、描画に入る前に 307 で / へ返す。
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

function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(({ name }) =>
      SESSION_COOKIE_NAMES.some((base) => name === base || name.startsWith(`${base}.`)),
    );
}

export function proxy(request: NextRequest) {
  if (hasSessionCookie(request)) {
    return NextResponse.next();
  }

  // ページ側の redirect("/") と同じ行き先。ホストはリクエストのものをそのまま使う。
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";

  return NextResponse.redirect(url, 307);
}

export const config = {
  // ログイン必須のルート。ページ側で auth() → redirect("/") しているものと同じ範囲。
  matcher: ["/decks/:path*", "/records/:path*", "/users/:path*", "/calendar"],
};
