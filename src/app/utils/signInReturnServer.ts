import { redirect } from "next/navigation";

import { buildSignInUrl, type SearchParams } from "@app/utils/signInReturn";

export type { SearchParams };

/*
 * 会員向けページの `if (!session)` で呼ぶ。トップへ飛ばし、ログイン後に元のページへ戻す
 * (utils/signInReturn)。redirect と同じく、ここで処理は終わる。
 *
 * セッション Cookie が無いアクセスは、ページより手前の proxy.ts が同じ行き先へ返す。
 * ここに来るのは Cookie はあるが中身が無効(期限切れ・鍵の不一致)だったとき。
 */
export function redirectToSignIn(pathname: string, searchParams?: SearchParams): never {
  redirect(buildSignInUrl(pathname, searchParams));
}
