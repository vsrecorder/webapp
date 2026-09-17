// データ由来のURLを <a href> に入れる前に通す。
//
// href に javascript: が入ると、クリックでその場のオリジンとしてスクリプトが動く。
// 保存時の検証は core-apiserver 側が行っているが、検証が入る前に保存された行や、
// 上流(公式サイト等)から取り込んだ値まで保証されているわけではないため、
// 描画するここでも安全側に倒す。
//
// http/https のみを通し、それ以外は undefined を返す。呼び出し側は undefined の場合に
// リンクを描画しない（リンクが消えるだけで、ページ自体は壊さない）。
export function safeExternalUrl(url: string | null | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // 相対URLなど、絶対URLとして解釈できない値は外部リンクとして扱わない
    return undefined;
  }

  // URLのコンストラクタはスキームを小文字に正規化するため、
  // "JavaScript:" のような値もここで弾ける。
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return undefined;
  }

  return url;
}

// データ由来のパスを router.push などサイト内遷移に使う前に通す。
//
// "/" 始まりの確認だけでは足りない。"//evil.example" はプロトコル相対 URL で、
// "/\\evil.example" も WHATWG URL は特殊スキームで "\\" を "/" と同じに扱うため、
// どちらも別オリジンへ解決される(App Router の router.push は別オリジンをフルページ遷移する)。
// 文字の形で弾くのではなく、実際に解決した結果のオリジンが自分と同じかで判定する。
export function isSameOriginPath(
  path: string | null | undefined,
  origin: string,
): path is string {
  if (!path || !path.startsWith("/")) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(path, origin);
  } catch {
    return false;
  }

  return parsed.origin === origin;
}
