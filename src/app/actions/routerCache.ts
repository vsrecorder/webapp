"use server";

import { cookies } from "next/headers";

/*
 * ブラウザ側のルーターのキャッシュ(Client Cache)を捨てさせるだけのサーバーアクション。
 *
 * ホームは <Link prefetch> で丸ごと先読みされ、staleTimes.static(180 秒)のあいだ
 * キャッシュした描画結果がそのまま出る。記録を作った・対戦を足した・記録を消したあとに
 * ナビのホームを押すと、操作の前に先読みしたホーム(記録中パネルが無い)が出てしまい、
 * 再読み込みするまで記録中パネルが現れなかった。
 *
 * 記録の作成などはルートハンドラ(/api/...)を fetch で呼んでおり、それではこのキャッシュは
 * 捨てられない。router.refresh() も Next.js 16 では「今いるルート」の分しか捨てない。
 *
 * 本番ビルドで確かめた、ほかのルートの先読み分まで捨てられる方法(2026-09-25):
 *   refresh()        … 捨てられない(今いるルートを描き直すだけ)
 *   revalidatePath() … 捨てられる。ただしサーバ側のデータキャッシュも捨てる。ホームのデータ
 *                      キャッシュは全員で共有しているので、誰かが記録するたびに全員の取り直しになる
 *   cookies の変更   … 捨てられる。サーバ側には何も残らない ← これを使う
 * どの方法でも、捨てた直後に先読みが自動でやり直されるので、次にホームを押すと新しい描画が出る。
 *
 * 変更の中身に意味は無いので、持っていない名前の cookie を「消す」。
 * ブラウザには期限切れの Set-Cookie が届くだけで、cookie は増えない。
 * 認証も入力も持たないので、外から呼ばれても害は無い。
 */
const ROUTER_CACHE_BUMP_COOKIE = "router_cache_bump";

export async function refreshClientRouterCache(): Promise<void> {
  (await cookies()).delete(ROUTER_CACHE_BUMP_COOKIE);
}
