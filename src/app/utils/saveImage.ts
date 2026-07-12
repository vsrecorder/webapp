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

export type ShareResult = "shared" | "text-only" | "unsupported" | "failed";

// 共有する画像。data URL は保存フォールバック用、File は共有用に事前生成しておく。
export type ShareImage = { dataUrl: string; filename: string; file: File };

// data URL を共有用の File に変換する。
// navigator.share() の呼び出し前に await を挟むとユーザーアクティベーションを
// 使い切ってしまうため、この変換はシェアボタンのタップより前に済ませておく。
export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], filename, { type: blob.type });
}

// Web Share API で「テキスト＋複数画像」をまとめて共有する。
// 画像ファイルの共有に対応していれば text と files を一緒に、
// 非対応(canShareがfalse)ならテキストのみで共有シートを開く。
// 共有できた/ユーザーが閉じた(AbortError)場合は成功扱い。
// API自体が無い場合は "unsupported"、失敗時は "failed" を返す。
//
// 重要: iOS(WebKit)の navigator.share() は「タップ直後の数秒(transient activation)」に
// 呼ばないと NotAllowedError で失敗する。そのため この関数は navigator.share() を
// 呼ぶまでに await を一切挟まない(画像は File 化済みのものを受け取る)。
// 呼び出し側も、タップハンドラ内で await してから呼ばないこと。
export async function shareRecord(
  images: ShareImage[],
  text: string,
): Promise<ShareResult> {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.share !== "function" ||
    typeof navigator.canShare !== "function"
  ) {
    return "unsupported";
  }

  try {
    const files = images.map((img) => img.file);
    // 実際に share() へ渡すデータそのもの(text込み)で判定する。
    // files だけで判定すると、テキストとの同時共有に対応しない環境で
    // canShare が true なのに share() が失敗する。
    const canShareFiles = files.length > 0 && navigator.canShare({ text, files });

    if (canShareFiles) {
      await navigator.share({ text, files });
      return "shared";
    }

    // 画像共有に非対応の環境ではテキストのみ共有する
    await navigator.share({ text });
    return "text-only";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "shared";
    return "failed";
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

// 複数枚の画像をまとめて保存する。
// Web Share API が使える環境では1回の共有シートで一括保存(写真アプリ等)を試み、
// 使えない/失敗した場合は間隔を空けて順次ダウンロードする(連続クリックのブロック回避)。
export async function saveImages(
  images: { dataUrl: string; filename: string }[],
): Promise<void> {
  if (images.length === 0) return;
  if (images.length === 1) {
    await saveGeneratedImage(images[0].dataUrl, images[0].filename);
    return;
  }

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function"
  ) {
    try {
      const files = await Promise.all(
        images.map(async (img) => {
          const blob = await (await fetch(img.dataUrl)).blob();
          return new File([blob], img.filename, { type: blob.type });
        }),
      );
      if (navigator.canShare({ files })) {
        await navigator.share({ files });
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      // 失敗時は順次ダウンロードにフォールバック
    }
  }

  for (const img of images) {
    const link = document.createElement("a");
    link.download = img.filename;
    link.href = img.dataUrl;
    link.click();
    // 連続ダウンロードのブロックを避けるため少し待つ
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
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
