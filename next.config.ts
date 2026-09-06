import type { NextConfig } from "next";

// 画像・スプライト・バッジを配信しているCDN（SAKURA_OBJECTSTORAGE_CDN_URL と同じ）。
// この値はクライアントに出るURLとして既にコード中に散在しているため、ここでも直に書く。
const CDN_ORIGIN = "https://xx8nnpgt.user.webaccel.jp";

// Next.js 16 から Turbopack が dev/build の既定バンドラになったが、
// このプロジェクトは package.json の scripts で --webpack を付けて明示的に降りている。
//
// 理由: @heroui/react のエントリは "use client" を持たないバレルで、47個の
// サブパッケージを export * で再輸出している。Turbopack はこのバレルを
// RSCグラフ上で実際に評価するため、依存の @react-aria/ssr(SSRProvider.tsx)が
// モジュールトップレベルで呼ぶ React.createContext に到達して落ちる
// ("createContext only works in Client Components")。webpack は該当モジュールを
// client reference に置換するので評価されず、これまで顕在化していなかった。
//
// Skeleton や loading.tsx を含む45ファイルがサーバコンポーネントのまま
// @heroui/react を使っているため、"use client" を足して回るとバンドル境界が
// 大きく変わる。下で有効にしている experimental.optimizePackageImports は
// バンドルサイズには効くが、この Turbopack のクラッシュは回避できないことを確認済み。
// 解消するには HeroUI 3.x への移行が要る（現在 2.8 系、メジャー跨ぎ）。
//
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
  `img-src 'self' data: blob: ${CDN_ORIGIN} https://lh3.googleusercontent.com https://pbs.twimg.com https://www.pokemon-card.com https://players.pokemon-card.com https://tonamel.com https://*.tonamel.com https://s3.isk01.sakurastorage.jp https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com https://*.g.doubleclick.net`,
  // Firebase Authentication(identitytoolkit/securetoken)、GA、スプライトCDNへのfetch。
  // GAの計測ビーコンは region1.google-analytics.com や analytics.google.com にも飛ぶ。
  // さらにGoogleシグナル有効時は www.google.com/g/collect や *.g.doubleclick.net にも
  // ビーコンが飛ぶ(Google公式CSPガイドの推奨に従い両ディレクティブへ許可)。
  // pokemon-card.com はデッキコードの有効性チェック(deckIDCheck.php)をブラウザから直接叩くため。
  `connect-src 'self' ${CDN_ORIGIN} https://www.pokemon-card.com https://*.googleapis.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.google.com https://*.g.doubleclick.net`,
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

    /*
     * @heroui/react のバレルを、実際に使うサブモジュールへの直接importに書き換える。
     *
     * このパッケージのエントリは47個のサブパッケージを export * で再輸出するバレルで、
     * 素のままだと使っていない部品まで初期JSに載る（実測で Autocomplete などが
     * 参照ゼロなのに同梱されていた）。
     *
     * 実測(本番ビルド / 圧縮後 / 表示までに読むJS):
     *   /cityleague_results 797→604KB、/ 777→587KB、/records 801→605KB、
     *   /decks 818→629KB、/records/create 852→728KB。おおむね2割強の削減。
     *
     * 注意: この最適化は import が解決されるモジュールを変えるため、上のコメントにある
     * 「サーバコンポーネントのまま @heroui/react を使うファイル群」(Skeleton 各種・
     * loading.tsx・DashboardSkeleton など)が影響を受けうる。書き換え先が "use client" を
     * 持たなければ createContext 系のエラーを踏む。有効化にあたって、それらが関わる画面
     * (各一覧の骨格表示・ダッシュボード・LP・規約類)を有無の2ビルドで撮り比べ、
     * DOM構造が完全一致すること・エラーが0件であることを確認済み。
     * HeroUI を上げるときは同じ確認をやり直すこと。
     */
    optimizePackageImports: ["@heroui/react"],
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
        hostname: "pokemon-card.com",
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
        hostname: "players.pokemon-card.com",
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
  // undici はサーバ起動時(src/instrumentation.ts)に fetch の keep-alive を延ばすために使う。
  // Node 専用の内部モジュールを含むため、バンドルせず node_modules から読む
  serverExternalPackages: ["undici"],
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
          /*
           * 前段の nginx に応答をバッファさせない(nginx はこのヘッダーを見て proxy_buffering を
           * その応答だけ切る。本番・ローカルとも proxy_ignore_headers は無く、proxy_http_version 1.1)。
           *
           * App Router はまずレイアウト(ヘッダー・下部ナビ)と loading.tsx の骨格を送り、
           * ページのデータ取得が終わってから本体を流す。バッファされると、ページ側の上流待ち
           * (デッキ一覧はきずな・戦績など3本で p50 70ms、p90 0.2秒)が終わるまで 1 バイトも
           * ブラウザへ届かず、その間は前のページか白い画面のままになる。
           * 実測(ローカル nginx 経由・ページに 2.5 秒の待ちを入れて): 先頭バイトが 2.65 秒 → 0.05 秒。
           */
          { key: "X-Accel-Buffering", value: "no" },
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
