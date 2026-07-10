// captureThemedPng 等で生成した data URL 形式の画像を端末に保存する。
//
// iOS Safari（特にホーム画面に追加したPWAのstandalone表示）では、
// data: URL に対する <a download> のプログラム的クリックが無視され、
// 画像が保存されないことがある。Web Share API が使える環境ではそちらを
// 優先し、共有シートの「画像を保存」から確実に写真アプリへ保存できるようにする。
export async function saveGeneratedImage(
  dataUrl: string,
  filename: string,
): Promise<void> {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function"
  ) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], filename, { type: blob.type });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch (e) {
      // ユーザーが共有シートを閉じた場合は失敗ではないため、
      // フォールバックせずに正常終了として扱う
      if (e instanceof DOMException && e.name === "AbortError") return;
      // それ以外のエラー（Web Share API非対応環境の実行時エラー等）は
      // 従来の <a download> 方式へフォールバックする
    }
  }

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
