// iOS端末（Safari本体、ホーム画面追加のPWA/standalone表示の両方を含む）かどうかを判定する。
// iPadOSはデフォルトでMac扱いのUserAgentを返すため、タッチ操作の有無で判定を補う。
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window)) return true;

  return ua.includes("Mac") && navigator.maxTouchPoints > 1;
}

// ホーム画面に追加したPWA(standalone表示)で起動しているかどうかを判定する。
// display-mode に加え、iOS Safari 独自の navigator.standalone も見る。
export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

// iOSのPWA(ホーム画面から起動した standalone 表示)かどうか。
export function isIOSPWA(): boolean {
  return isIOS() && isStandalonePWA();
}

// LINEのアプリ内ブラウザかどうか。
// LINEだけは外部ブラウザ起動が公式にサポートされているため、他と分けて判定する。
function isLineInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;

  return /\bLine\//i.test(navigator.userAgent);
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;

  return /Android/i.test(navigator.userAgent);
}

// LINEやX等のアプリ内ブラウザ(WebView)で開かれているかどうかを判定する。
// Googleは埋め込みWebView内でのOAuthを許可していない(disallowed_useragent)ため、
// これらの環境ではソーシャルログインを実行させず、外部ブラウザへ誘導する必要がある。
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;

  // アプリ名がUserAgentに現れるもの
  if (isLineInAppBrowser()) return true;
  if (/FBAN|FBAV|Instagram|Twitter|MicroMessenger|KAKAOTALK/i.test(ua)) return true;

  // Androidの汎用WebViewはUserAgentに "; wv" を含む
  if (isAndroid() && /\bwv\b/.test(ua)) return true;

  // iOSのWKWebViewはUserAgentに "Safari/" を含まない。
  // ただしホーム画面に追加したPWA(standalone表示)も同様に含まないため、そちらは除外する。
  if (isIOS() && !/Safari\//.test(ua) && !isStandalonePWA()) return true;

  return false;
}

// アプリ内ブラウザから外部ブラウザを起動する手段があるかどうか。
// iOS(LINE以外)にはWebViewからSafariを開く公式手段が存在しないため、
// 呼び出し側はこれがfalseの場合にURLコピーなどの代替手段を案内する。
export function canOpenInExternalBrowser(): boolean {
  return isLineInAppBrowser() || isAndroid();
}

// 指定URLを外部ブラウザ(ユーザーのデフォルトブラウザ)で開くことを試みる。
// 標準のWeb APIは存在しないため環境ごとの固有手段に頼る。手段がなければfalseを返す。
// WebViewはユーザー操作を伴わない遷移を無視することがあるため、必ずタップ等の
// ユーザー操作を起点に呼び出すこと。
export function openInExternalBrowser(url: string): boolean {
  if (typeof window === "undefined") return false;

  const target = new URL(url, window.location.href);

  // LINEはクエリパラメータによる外部ブラウザ起動を公式にサポートしている
  if (isLineInAppBrowser()) {
    target.searchParams.set("openExternalBrowser", "1");
    window.location.href = target.toString();
    return true;
  }

  // Androidはintentスキームでブラウザに引き渡せる。
  // packageを指定せず、ユーザーのデフォルトブラウザを尊重する。
  if (isAndroid()) {
    const scheme = target.protocol.replace(":", "");
    window.location.href =
      `intent://${target.host}${target.pathname}${target.search}` +
      `#Intent;scheme=${scheme};action=android.intent.action.VIEW;end`;
    return true;
  }

  return false;
}
