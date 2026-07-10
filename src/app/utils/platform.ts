// iOS端末（Safari本体、ホーム画面追加のPWA/standalone表示の両方を含む）かどうかを判定する。
// iPadOSはデフォルトでMac扱いのUserAgentを返すため、タッチ操作の有無で判定を補う。
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window)) return true;

  return ua.includes("Mac") && navigator.maxTouchPoints > 1;
}
