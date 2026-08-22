// 画像＋ポスト文の共有処理。
//
// 共有の成否は環境差が大きく（Android で text と files を一緒に渡せない、
// 共有 API そのものが無い、など）、結果ごとに何を伝えて何へ逃がすかが決まっている。
// 同じ判断を複数のモーダルで書き写さないよう、ここに1つだけ置く。
//
// ★ iOS(WebKit) の navigator.share() は「タップから数秒(transient activation)」の
//   間に呼ばないと失敗する。画像はこの関数を呼ぶ前に用意しておくこと
//   （タップハンドラの中で生成してはいけない）。

import { addToast } from "@heroui/react";
import { sendGAEvent } from "@next/third-parties/google";

import { shareRecord, saveImages, type ShareImage } from "@app/utils/saveImage";

type Options = {
  // GA4 の share イベントに載せる区分（分析パネルごとに分けて見るため）
  analyticsLabel: string;
  // Android で画像だけを共有する回避策を使うか
  imagesOnlyOnAndroid: boolean;
};

export async function shareImagesWithText(
  images: ShareImage[],
  text: string,
  { analyticsLabel, imagesOnlyOnAndroid }: Options,
): Promise<void> {
  const result = await shareRecord(images, text, { imagesOnlyOnAndroid });

  sendGAEvent("event", "share", {
    method: "web_share",
    content_type: analyticsLabel,
    share_result: result,
  });

  if (result === "images-only") {
    // Android では画像だけを共有したため、ポスト文は含まれていない。
    // モーダルの「ポスト文」からコピーして貼り付けてもらうよう促す。
    addToast({
      title: "画像を共有しました",
      description: "ポスト文はコピーして貼り付けてください",
      color: "warning",
      timeout: 6000,
    });
    return;
  }

  if (result === "unsupported") {
    if (images.length === 0) {
      addToast({
        title: "共有に非対応の環境です",
        description: "ポスト文はコピーしてご利用ください",
        color: "warning",
        timeout: 5000,
      });
      return;
    }
    // 共有非対応の環境では画像を保存にフォールバックする
    await saveImages(images);
    addToast({
      title: "共有に非対応のため画像を保存しました",
      description: "ポスト文はコピーしてご利用ください",
      color: "warning",
      timeout: 5000,
    });
    return;
  }

  if (result === "text-only" && images.length > 0) {
    // テキストと画像を一緒に共有できない環境。画像は黙って落ちてしまうため、
    // 保存にフォールバックしたうえで知らせる。
    await saveImages(images);
    addToast({
      title: "画像を一緒に共有できない環境です",
      description: "ポスト文のみ共有し、画像は保存しました",
      color: "warning",
      timeout: 5000,
    });
    return;
  }

  if (result === "failed") {
    addToast({ title: "共有に失敗しました", color: "danger", timeout: 5000 });
  }
}
