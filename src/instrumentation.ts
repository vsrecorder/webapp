/*
 * サーバ起動時に一度だけ走る(Next の instrumentation 規約)。
 *
 * サーバ側の fetch(BFF ルートとサーバコンポーネントから core-apiserver へ向かうもの)の
 * 接続を長めに保つ。Node(undici)の既定は keep-alive 4 秒で、利用者の操作は数秒おきなので
 * ほとんどの呼び出しが「アイドル後の再接続」になっていた。
 *
 * 実測(2026-09-07):
 *   - 本番 nginx ログ: core-apiserver 本体は p50 9ms なのに、webapp から見た上流呼び出しは p50 57ms。
 *     差の大半が接続の張り直し(DNS + TCP + TLS)。
 *   - 手元から https://vsrecorder.mobi へ: 既定の dispatcher はアイドル 5〜20 秒後に 46〜50ms、
 *     keep-alive 25 秒の Agent だと 14〜15ms(接続が再利用される)。
 *
 * 25 秒なのは、前段 nginx の keepalive_timeout が 30 秒で、サーバより先に閉じないと
 * 「閉じられた直後の接続へ書いてしまう」失敗が起きうるため。nginx 側を変えるときはここも合わせる。
 * 上流を直接つなぐ構成(VSRECORDER_UPSTREAM_ORIGIN)でも同じ Agent が使われる。
 */
const UPSTREAM_KEEP_ALIVE_MS = 25_000;

export async function register() {
  // Edge ランタイムとビルド時には何もしない(undici は Node 専用)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // webpackIgnore: dev の webpack は undici を追ってしまい、内部の node: スキームで
  // ビルドに失敗する(その結果、OGP画像を作るページが 500 になる)。
  // serverExternalPackages では instrumentation の解決までは抑えられないため、
  // ここで実行時 import に降ろして解決させない。
  const { Agent, setGlobalDispatcher } = await import(/* webpackIgnore: true */ "undici");

  // グローバルの dispatcher は Node 本体の fetch と共有される(Symbol.for で登録される)ので、
  // Next がラップした fetch も含めてサーバ側の全 fetch に効く
  setGlobalDispatcher(
    new Agent({
      keepAliveTimeout: UPSTREAM_KEEP_ALIVE_MS,
      keepAliveMaxTimeout: UPSTREAM_KEEP_ALIVE_MS,
    }),
  );
}
