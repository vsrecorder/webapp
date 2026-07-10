// Web Share API で画像の共有(ファイル共有)を試みる。
// 共有シートを開けた場合、あるいはユーザーが共有シートを閉じた場合(AbortError)は
// 「処理は完了した」とみなし true を返す。API非対応やそれ以外のエラーは false を返す。
export async function tryShareImage(dataUrl: string, filename: string): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.share !== "function" ||
    typeof navigator.canShare !== "function"
  ) {
    return false;
  }

  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], filename, { type: blob.type });

    if (!navigator.canShare({ files: [file] })) return false;

    await navigator.share({ files: [file] });
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return true;
    return false;
  }
}

// captureThemedPng 等で生成した data URL 形式の画像を端末に保存する。
//
// iOS Safari（特にホーム画面に追加したPWAのstandalone表示）では、
// data: URL に対する <a download> のプログラム的クリックが無視され、
// 画像が保存されないことがある。Web Share API が使える環境ではそちらを
// 優先し、使えない場合のみ従来の <a download> 方式にフォールバックする。
export async function saveGeneratedImage(
  dataUrl: string,
  filename: string,
): Promise<void> {
  if (await tryShareImage(dataUrl, filename)) return;

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

// data URL を新しいタブでそのまま開く。
// iOSホーム画面PWA(standalone表示)では、ページに埋め込んだ<img>の長押しメニューが
// 「コピー」のみに縮小され「"写真"に追加」が出せないことがある。
// 画像そのものをドキュメントとして開いた場合はSafari標準の画像表示になり、
// 保存UIが有効になりやすいため、iOSではこちらを優先して使う。
// window.open がポップアップブロックされた場合は呼び出し側でフォールバックできるよう
// 成否を真偽値で返す。
export function openImageInNewTab(dataUrl: string): boolean {
  const win = window.open(dataUrl, "_blank");
  return win !== null;
}
