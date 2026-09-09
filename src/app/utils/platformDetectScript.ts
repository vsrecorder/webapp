// ペイント前に <html> へ実行環境の目印を付けるインラインスクリプト(layout.tsx で <body> 先頭に置く)。
//
// - iOS の standalone PWA なら data-ios-pwa、Android なら data-android を付ける。
//   下部ナビ(MobileNavigation)のレイアウトを CSS 側で切り替えるための目印で、
//   クライアント判定を useEffect で行うと初回描画後にガタつくため、ペイント前に確定させる。
// - Android の standalone PWA では <meta name="theme-color"> を足し、アプリ表示中の
//   ステータスバーをヘッダー色にする。manifest の theme_color はスプラッシュの地色に
//   揃えてあるため(pwaColors.ts 参照)、これが無いと表示中もスプラッシュの青のままになる。
//   ブラウザ表示(タブ)には付けない。Chrome のアドレスバーまで色が変わるのは意図していない。
//   iOS にも付けない。standalone のステータスバーの地色がこの色に変わってしまう。
export function platformDetectScript(statusBarColor: string): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(statusBarColor)) {
    throw new Error(`theme-color は #RRGGBB 形式で指定する: ${statusBarColor}`);
  }
  return (
    "(function(){try{" +
    "var ua=navigator.userAgent;" +
    "var isIOS=(/iPad|iPhone|iPod/.test(ua)&&!('MSStream' in window))||(ua.indexOf('Mac')>-1&&navigator.maxTouchPoints>1);" +
    "var isStandalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;" +
    "if(isIOS&&isStandalone){document.documentElement.setAttribute('data-ios-pwa','true');}" +
    "if(!isIOS&&/Android/i.test(ua)){" +
    "document.documentElement.setAttribute('data-android','true');" +
    "if(isStandalone){var m=document.createElement('meta');m.name='theme-color';m.content='" +
    statusBarColor +
    "';document.head.appendChild(m);}" +
    "}" +
    "}catch(e){}})();"
  );
}
