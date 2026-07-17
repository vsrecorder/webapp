import type { NextConfig } from "next";

// 画像・スプライト・バッジを配信しているCDN（SAKURA_OBJECTSTORAGE_CDN_URL と同じ）。
// この値はクライアントに出るURLとして既にコード中に散在しているため、ここでも直に書く。
const CDN_ORIGIN = "https://xx8nnpgt.user.webaccel.jp";

// 開発時のみ webpack の HMR が eval を使う
const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy。
// script-src / style-src の 'unsafe-inline' は現状の作りでは外せない:
//   - layout.tsx が iOS PWA 判定のインラインスクリプトをペイント前に実行している
//   - GoogleAnalytics(@next/third-parties)がインラインスクリプトを出す
//   - experimental.inlineCss で CSS を <style> として埋め込んでいる
// nonce化にはリクエストごとの middleware が要るため、ここでは
// 「どこへ通信できるか」「誰に埋め込ませるか」を絞ることを主眼に置く。
const CSP = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' ${isDev ? `'unsafe-eval' ` : ""}https://www.googletagmanager.com https://apis.google.com`,
  `style-src 'self' 'unsafe-inline'`,
  `font-src 'self' data:`,
  // next/imageの最適化元(remotePatterns)と、canvasで画像を組み立てるためのdata:/blob:
  // tonamel.com はイベントのog:image(core-apiserverが競技ページから抽出した値)を
  // そのまま<img>で表示するため。カバー画像がサブドメインのCDNから配信される場合に
  // 備えてワイルドカードも許可する。
  `img-src 'self' data: blob: ${CDN_ORIGIN} https://lh3.googleusercontent.com https://pbs.twimg.com https://www.pokemon-card.com https://tonamel.com https://*.tonamel.com https://s3.isk01.sakurastorage.jp https://www.googletagmanager.com https://www.google-analytics.com`,
  // Firebase Authentication(identitytoolkit/securetoken)、GA、スプライトCDNへのfetch。
  // GAの計測ビーコンは region1.google-analytics.com や analytics.google.com にも飛ぶ。
  // pokemon-card.com はデッキコードの有効性チェック(deckIDCheck.php)をブラウザから直接叩くため。
  `connect-src 'self' ${CDN_ORIGIN} https://www.pokemon-card.com https://*.googleapis.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com`,
  // Firebase Authenticationのログインポップアップ/iframe
  `frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://apis.google.com`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  // X-Frame-Optionsの後継。埋め込みを一切許可しない。
  `frame-ancestors 'none'`,
].join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["local.vsrecorder.mobi"],
  experimental: {
    // CSSを<head>へ<style>としてインライン化する設定。
    // レンダリングブロッキングなCSSリクエストを消すために一度は有効にしていたが、
    // このプロジェクトのCSSはHeroUIのテーマ全体を含んで318KBあり、
    // インライン化が有効な「クリティカルCSS」の規模(目安14KB)を大きく超えていた。
    //
    // 有効時の実測: 同じCSSが<style>(318KB)とRSCペイロード(384KB)に二重に載り、
    // トップページのHTMLが1,077KBに膨らんでいた。ルートは page.tsx が auth() を
    // 呼ぶため動的レンダリングになり Cache-Control: no-store が付くので、
    // この700KBが全ページビューで再生成・再送されていた。
    //
    // 外部ファイル化すればハッシュ付きで恒久キャッシュされ、初回訪問でも
    // 転送量は減る(139KB→90KB)。コストは初回のみの1RTTだが、HTTP/2の多重化で
    // HTML転送と並行するため大半は隠れる。
    //
    // 再び有効にする場合は、CSSがクリティカルCSSの規模に収まっていることを
    // 確認すること。この規模のままではSSRのスループットを削るだけになる。
    inlineCss: false,
  },
  images: {
    // 最適化画像のキャッシュ最小保持時間（秒）
    // 画像の更新を早く反映したいので短めに設定。長くすると再最適化の負荷は減る。
    // 注意: 元画像のCache-Controlのmax-ageの方が長い場合はそちらが優先される。
    minimumCacheTTL: 3600,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.pokemon-card.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "s3.isk01.sakurastorage.jp",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "xx8nnpgt.user.webaccel.jp",
        port: "",
        pathname: "/**",
      },
    ],
  },
  reactStrictMode: false,
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // MIMEスニッフィングを禁止する。CDN上のユーザーアップロード画像などを
          // ブラウザが別の型として解釈するのを防ぐ。
          { key: "X-Content-Type-Options", value: "nosniff" },
          // 外部サイトへは参照元をオリジンまでしか送らない（記録IDなどをパスに含むため）
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // このサイトをiframeに埋め込ませない（クリックジャッキング対策）
          { key: "X-Frame-Options", value: "DENY" },
          // 使っていないブラウザ機能は明示的に閉じる
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
    ];
  },
  // OGP画像の生成に使う日本語フォント（計11.5MB）は、サーバ側で readFile するだけで
  // HTTP配信する必要がない。public/ に置くと誰でもダウンロードできてしまうため assets/ に置き、
  // standalone の出力に含めるようここで明示する（.next/standalone/assets/fonts/ にコピーされ、
  // Dockerfile が standalone ごと実行時イメージへ持っていく）。
  outputFileTracingIncludes: {
    "/**": ["./assets/fonts/**"],
  },
};

export default nextConfig;
