import { readCookieValue } from "@app/utils/deckListPrefs";

/*
 * ブラウザ側の cookie 読み書き(表示設定のような、秘密でない小さな値向け)。
 * サーバでは何もしない(読みは null、書きは無視)。
 */

export function readClientCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  return readCookieValue(document.cookie, name);
}

// maxAgeSeconds を省くとセッション cookie(ブラウザを閉じるまで)
export function writeClientCookie(name: string, value: string, maxAgeSeconds?: number): void {
  if (typeof document === "undefined") return;

  const secure =
    typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  const maxAge = maxAgeSeconds === undefined ? "" : `; Max-Age=${maxAgeSeconds}`;

  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax${maxAge}${secure}`;
}
