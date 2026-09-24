// ペイント前に <html> へ実行環境の目印を付けるインラインスクリプト(layout.tsx で <body> 先頭に置く)。
//
// - iOS の standalone PWA なら data-ios-pwa、Android なら data-android を付ける。
//   下部ナビ(MobileNavigation)のレイアウトを CSS 側で切り替えるための目印で、
//   クライアント判定を useEffect で行うと初回描画後にガタつくため、ペイント前に確定させる。
// - standalone(ホーム画面アプリ)なら OS を問わず data-standalone を付ける。ヘッダーの上端を
//   通知バーの色から溶かす層(Header.tsx / globals.css)はこの目印があるときだけ出す。
// - standalone では <meta name="theme-color"> も足し、通知バーを statusBarColor で塗る。
//   iOS はこれがそのまま通知バーの地色になる(文字色は iOS が地色の明暗から決める)。
//   Android の WebAPK は meta を反映せず manifest の theme_color を使うが、同じ色なので揃う
//   (pwaColors.ts 参照)。
//   ブラウザ表示(タブ)には付けない。アドレスバーまで色が変わるのは意図していない。
export function platformDetectScript(statusBarColor: string): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(statusBarColor)) {
    throw new Error(`theme-color は #RRGGBB 形式で指定する: ${statusBarColor}`);
  }
  return (
    "(function(){try{" +
    "var ua=navigator.userAgent;" +
    "var isIOS=(/iPad|iPhone|iPod/.test(ua)&&!('MSStream' in window))||(ua.indexOf('Mac')>-1&&navigator.maxTouchPoints>1);" +
    "var isStandalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;" +
    "if(isStandalone){" +
    "document.documentElement.setAttribute('data-standalone','true');" +
    "var m=document.createElement('meta');m.name='theme-color';m.content='" +
    statusBarColor +
    "';document.head.appendChild(m);" +
    "}" +
    "if(isIOS&&isStandalone){document.documentElement.setAttribute('data-ios-pwa','true');}" +
    "if(!isIOS&&/Android/i.test(ua)){document.documentElement.setAttribute('data-android','true');}" +
    "}catch(e){}})();"
  );
}
