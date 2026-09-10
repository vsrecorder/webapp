/*
 * ログイン済みかを Cookie の有無だけで判定する。
 *
 * 中身(JWT)の検証はしない。検証が要る場面では auth() を使うこと。ここが答えるのは
 * 「セッション Cookie を持っているか」だけで、I/O を伴わないぶん、描画をブロックできない
 * 場所(proxy.ts のガード、loading.tsx のフォールバック)から呼べるのが利点。
 *
 * Cookie 名は next-auth の既定(auth.ts が useSecureCookies: true なので __Secure- 付き)。
 * セッションが大きいと "<name>.0", "<name>.1" に分割されるため前方一致でも見る。
 */
const SESSION_COOKIE_NAMES = ["__Secure-authjs.session-token", "authjs.session-token"];

/**
 * セッション Cookie を持っているか。
 * NextRequest.cookies.getAll() と next/headers の cookies().getAll() の
 * どちらの戻り値もそのまま渡せる。
 */
export function hasSessionCookie(cookies: readonly { name: string }[]): boolean {
  return cookies.some(({ name }) =>
    SESSION_COOKIE_NAMES.some((base) => name === base || name.startsWith(`${base}.`)),
  );
}
