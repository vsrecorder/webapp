// 画像 CDN(スプライト・デッキ画像)のオリジン。
// CSP(img-src / connect-src。utils/csp.ts)と、head の preconnect(layout.tsx)もこの CDN を指す。
// CSP の定義(utils/csp.ts)は、ここを相対パスで import している。next.config.ts の画像の許可
// (images.remotePatterns)は hostname を直に書いているので、変えるときはそちらも合わせること。
export const CDN_ORIGIN = "https://xx8nnpgt.user.webaccel.jp";
