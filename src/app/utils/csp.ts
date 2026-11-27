import { CDN_ORIGIN } from "./cdn";

/*
 * Content-Security-Policy の組み立て。
 *
 * 応答の種類で 2 通りに分かれる。
 *   - ページ(HTML): src/proxy.ts が要求ごとに nonce を作り、pageCsp(nonce) を付ける
 *   - それ以外(API・public のファイルなど): next.config.ts が staticCsp() を付ける
 * 違うのは script-src だけなので、ほかのディレクティブはここで共有する。
 *
 * このファイルは next.config.ts からも読む。設定ファイルの読み込みでは tsconfig の別名
 * (@app/…)が効かないので、import は相対パスだけにすること。
 *
 * script-src に 'unsafe-inline' を置かない(2026-10-31 のセキュリティ精査 L-9):
 *   以前はページに直接書かれたスクリプトを無条件に許していた。どこかに XSS の穴があったとき、
 *   差し込まれた <script> や onclick="…" を CSP が止められなかった。いまは nonce の付いた
 *   スクリプトだけが動く。nonce は要求のたびに変わるので、攻撃する側は事前に知りようがない。
 *
 * nonce が付く場所:
 *   - Next.js が出すスクリプト(チャンクの読み込み・RSC のペイロード)。Next.js が要求ヘッダの
 *     Content-Security-Policy から 'nonce-…' を読み取って自分で付ける
 *   - layout.tsx のインラインスクリプト(platformDetectScript)、Google アナリティクスの初期化、
 *     next-themes のテーマ初期化(Providers)。layout.tsx が x-nonce ヘッダから読んで渡している。
 *     インラインスクリプトを出す部品を足すときは、同じように nonce を渡すこと
 *   - 構造化データ(<script type="application/ld+json">)は実行されないデータなので、CSP の対象外
 *
 * 'strict-dynamic':
 *   nonce 付きのスクリプトが自分で読み込むスクリプトも許す(gtag.js が取りに行く計測用の
 *   スクリプト、Firebase Authentication が読み込む apis.google.com の api.js など)。
 *   対応しているブラウザ(Chrome 52〜・Safari 15.4〜・Firefox 52〜)は、'self' とホスト名の指定を
 *   無視して nonce だけで判定する。ホスト名で許すと、そのホストに置ける別のスクリプト(たとえば
 *   他人の GTM コンテナ)まで通るので、これが本来の守り方。
 *   'self' とホスト名は、'strict-dynamic' を知らない古いブラウザ(Safari 15.3 以前)のために残す。
 *   そちらでは nonce + 'self' + ホスト名で、いままでと同じスクリプトが動く。
 *
 * style-src の 'unsafe-inline' は残す:
 *   React の style 属性(HeroUI・framer-motion が大量に使う)には nonce を付けられず、
 *   react-select(emotion)は実行時に <style> を差し込む。CSS の差し込みはスクリプトほどの
 *   害が無いので、ここは通信先と埋め込み元を絞るほうに任せる。
 */

// 開発時のみ webpack の HMR と React のデバッグ情報が eval を使う
const isDev = process.env.NODE_ENV !== "production";

// 'strict-dynamic' を知らないブラウザ向けの、外部スクリプトの読み込み元。
// GA4(gtag.js)と、Firebase Authentication のログイン(api.js)
const SCRIPT_HOSTS = "https://www.googletagmanager.com https://apis.google.com";

// script-src 以外。ページとそれ以外で共通
const SHARED_DIRECTIVES = [
  `default-src 'self'`,
  `style-src 'self' 'unsafe-inline'`,
  `font-src 'self' data:`,
  // 画像の読み込み元と、canvasで画像を組み立てるためのdata:/blob:。
  // 最適化APIを通さない素の<img>(利用者のアイコン等)も対象なので、images.remotePatterns より広い。
  // tonamel.com はイベントのog:image(core-apiserverが競技ページから抽出した値)を
  // そのまま<img>で表示するため。カバー画像がサブドメインのCDNから配信される場合に
  // 備えてワイルドカードも許可する。
  `img-src 'self' data: blob: ${CDN_ORIGIN} https://lh3.googleusercontent.com https://pbs.twimg.com https://www.pokemon-card.com https://players.pokemon-card.com https://tonamel.com https://*.tonamel.com https://s3.isk01.sakurastorage.jp https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com https://*.g.doubleclick.net`,
  // Firebase Authentication(identitytoolkit/securetoken)、GA、スプライトCDNへのfetch。
  // GAの計測ビーコンは region1.google-analytics.com や analytics.google.com にも飛ぶ。
  // さらにGoogleシグナル有効時は www.google.com/g/collect や *.g.doubleclick.net にも
  // ビーコンが飛ぶ(Google公式CSPガイドの推奨に従い両ディレクティブへ許可)。
  // pokemon-card.com はデッキコードの有効性チェック(deckIDCheck.php)をブラウザから直接叩くため。
  `connect-src 'self' ${CDN_ORIGIN} https://www.pokemon-card.com https://*.googleapis.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.google.com https://*.g.doubleclick.net`,
  // Firebase Authenticationのログインポップアップ/iframe
  `frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://apis.google.com`,
  // Service Worker(/sw.js、push 通知)。書かないと script-src に従う。'strict-dynamic' の下での
  // Worker の扱いはブラウザごとに揺れがあったので、同じオリジンだけと明示しておく
  `worker-src 'self'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  // X-Frame-Optionsの後継。埋め込みを一切許可しない。
  `frame-ancestors 'none'`,
];

function join(scriptSrc: string): string {
  const [defaultSrc, ...rest] = SHARED_DIRECTIVES;
  return [defaultSrc, scriptSrc, ...rest].join("; ");
}

// nonce に使える文字(base64)。それ以外が混ざると、ヘッダの中で別のディレクティブを
// 足されるおそれがあるので受け付けない
const NONCE_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

/** ページ(HTML)に付ける CSP。nonce は要求ごとに作り直した値を渡す */
export function pageCsp(nonce: string): string {
  if (!NONCE_PATTERN.test(nonce)) {
    throw new Error("CSP の nonce が base64 ではない");
  }
  return join(
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? `'unsafe-eval' ` : ""}${SCRIPT_HOSTS}`,
  );
}

/*
 * ページ以外(API・public のファイルなど、src/proxy.ts を通らない応答)に付ける CSP。
 *
 * これらは HTML として開かれる前提が無いので nonce は要らず、インラインのスクリプトも許さない。
 * 万一ブラウザで直接開かれても(JSON や SVG など)、中のスクリプトは動かない。
 */
export function staticCsp(): string {
  return join(`script-src 'self' ${isDev ? `'unsafe-eval' ` : ""}${SCRIPT_HOSTS}`);
}

/** 要求ごとの nonce(128 ビットの乱数を base64 にしたもの) */
export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

// proxy.ts が nonce を載せる要求ヘッダ。layout.tsx が headers() で読む
export const NONCE_HEADER = "x-nonce";
