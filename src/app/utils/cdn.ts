// 画像 CDN(スプライト・デッキ画像)のオリジン。
// next.config.ts の CSP(img-src / connect-src)と、head の preconnect(layout.tsx)もこの CDN を指す。
// 変えるときは next.config.ts 側も合わせること(あちらは設定ファイルなのでここを import できない)。
export const CDN_ORIGIN = "https://xx8nnpgt.user.webaccel.jp";
