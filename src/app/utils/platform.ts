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
