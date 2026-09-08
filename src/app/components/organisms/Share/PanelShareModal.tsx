"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { useCaptureWidth } from "@app/hooks/useCaptureWidth";
import { useClientValue } from "@app/hooks/useClientValue";

import {
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Textarea,
  Spinner,
  addToast,
} from "@heroui/react";

import {
  LuCheck,
  LuCopy,
  LuImageOff,
  LuRefreshCw,
  LuShare2,
  LuTriangleAlert,
} from "react-icons/lu";

import { sendGAEvent } from "@next/third-parties/google";

import {
  captureThemedPng,
  hasUnloadedImages,
} from "@app/utils/captureImage";
import {
  dataUrlToFile,
  ANDROID_SHARE_IMAGES_ONLY,
  type ShareImage,
} from "@app/utils/saveImage";
import { Modal } from "@app/components/atoms/AppModal";
import { shareImagesWithText } from "@app/utils/shareWithText";
import { isAndroid } from "@app/utils/platform";
import { scrollIntoViewAfterKeyboard } from "@app/utils/keyboard";

import { useModalDragToClose } from "@app/hooks/useModalDragToClose";
import { closingPassthroughClassNames } from "@app/utils/modal";

// モーダルを開いてからキャプチャ用DOMを描画するまでの待ち時間(ms)。
// 開くアニメーションの最中に画面外のカードを描画すると、その重さがそのまま
// 開く動きのカクつきになるため、動き終わってから描画する。
const CAPTURE_MOUNT_DELAY_MS = 400;

// キャプチャ用DOMを描画してから画像の生成を始めるまでの待ち時間(ms)。
// 生成は端末のメインスレッドを長く占有するため、まず描画を通してから走らせる。
const CAPTURE_DEBOUNCE_MS = 250;

// 画像生成の上限時間(ms)。スプライト画像の取得が詰まると描画ライブラリが
// 返ってこないことがあるため、待ち続けずに失敗として扱う。
// 複数枚のときは1枚ごとにこの時間を見るので、待ち時間は最大で「枚数 × この値」になる。
const CAPTURE_TIMEOUT_MS = 15000;

type Props = {
  isOpen: boolean;
  onOpenChange: () => void;
  onClose: () => void;
  // モーダル冒頭に出す説明文（例: 「戦績分析を画像にして…」）
  description: string;
  // ポスト文の初期値。開いたときとデータが変わったときに反映する（手編集は破棄される）
  postText: string;
  // 書き出しファイル名の接頭辞（例: "user_stat"）
  filenamePrefix: string;
  // 書き出しの指定。既定は「端末幅に合わせた幅＋余白＋サービスフッター」で、
  // 画面のパネルをそのまま画像にする用途に合わせてある。
  // 実寸が決まっていて縦横比を保ちたいカード（月次ふりかえりカードなど）は、
  // width を固定し bare を立てて、カード自身の見た目だけを書き出す。
  capture?: {
    // 書き出し幅(px)。省略時は端末の画面幅から算出する
    width?: number;
    // 余白とサービスフッターを付けない（カードが自前でサービス表記を持つ場合）
    bare?: boolean;
    // 端末のテーマ設定を無視して配色を固定する
    theme?: "light" | "dark";
    // 書き出しの pixelRatio の希望値（既定 4）。大きなカードでは下げる
    desiredPixelRatio?: number;
  };
  // 画面外に描画するシェア画像の中身。書き出し幅(px)を受け取って描く（1枚のとき）
  children?: (captureWidth: number) => ReactNode;
  // 複数枚をまとめて書き出す場合はこちらを渡す（children より優先）。
  // 生成は順番に行い、共有も1回で全部を渡す。
  sheets?: Array<{ key: string; node: ReactNode }>;
};

/*
 * ダッシュボードの分析パネル用のシェアモーダル。
 *
 * 画面外にシェア用カードを描画して1枚のPNGに書き出し、ポスト文とともに
 * Web Share API で共有する。記録のシェア(ShareRecordModal)と同じ流れだが、
 * 画像は常に1枚・オプションのトグルは持たない。
 *
 * 画像は「シェアする」をタップする前に生成しておく。iOS(WebKit)の navigator.share() は
 * タップから数秒(transient activation)の間に呼ばないと失敗するため、
 * タップハンドラ内で生成してはいけない(詳細は utils/saveImage.ts のコメントを参照)。
 */
export default function PanelShareModal({
  isOpen,
  onOpenChange,
  onClose,
  description,
  postText,
  filenamePrefix,
  capture,
  children,
  sheets,
}: Props) {
  const captureRefs = useRef<(HTMLDivElement | null)[]>([]);

  // キャプチャ対象の幅。実寸が決まっているカードは端末幅に合わせず、その幅で書き出す。
  // それ以外は書き出し画像の横幅が端末の画面幅いっぱいになるよう端末の画面幅から決める
  // (useCaptureWidth。SSR 時は 360)
  const viewportCaptureWidth = useCaptureWidth();
  const captureWidth = capture?.width ?? viewportCaptureWidth;
  const [captureMounted, setCaptureMounted] = useState(false);
  // 「再生成」「作り直す」を押したときに生成し直すための世代番号
  const [regenSeq, setRegenSeq] = useState(0);
  const [busy, setBusy] = useState<null | "share">(null);
  // ポスト文をコピーしたか(コピーボタンの見た目を一時的に切り替えるのに使う)
  const [textCopied, setTextCopied] = useState(false);
  // Android 端末か。SSR では navigator を参照できないため、ハイドレーション後に判定する。
  const isAndroidDevice = useClientValue(isAndroid, false);

  /*
   * 生成した画像。どの条件(captureKey)で撮ったかも持つ。
   * 条件が変わっていれば生成中(capturing)で、その間もプレビューには前の画像を残す
   * (消すと枠の高さが変わって飛び跳ねる)。生成中に条件が変わった/閉じた場合は、
   * 後から終わった古い生成結果は(条件が違うので)そのまま捨てられる。
   *   incomplete … 生成した画像にスプライト等の欠けがあるか(読み込めなかった画像が残っていたか)。
   *                欠けは画像を見なくても判定できるため、黙ってシェアさせずに知らせる
   *   failed     … 画像の生成そのものに失敗したか。失敗を伝えるだけだと手詰まりになるため、
   *                作り直すか、ポスト文だけでシェアするかを選べるようにする
   */
  const captureKey =
    isOpen && captureMounted
      ? [
          captureWidth,
          filenamePrefix,
          sheets?.length ?? 1,
          regenSeq,
          capture?.bare ? 1 : 0,
          capture?.theme ?? "",
          capture?.desiredPixelRatio ?? "",
        ].join("|")
      : null;
  const [captured, setCaptured] = useState<{
    key: string;
    images: ShareImage[];
    incomplete: boolean;
    failed: boolean;
  } | null>(null);
  // 複数枚のときの進捗（何枚目まで作れたか）
  const [progress, setProgress] = useState<{ key: string; count: number } | null>(null);
  const currentCapture = captureKey !== null && captured?.key === captureKey ? captured : null;
  const images = captured?.images ?? [];
  const incomplete = currentCapture?.incomplete ?? false;
  const captureFailed = currentCapture?.failed ?? false;
  const capturing = captureKey !== null && currentCapture === null;
  const capturedCount = progress?.key === captureKey ? progress.count : 0;

  // ポスト文。開くたびに既定値(postText)へ戻す(前回の手編集を引きずらない)。
  // 手編集はどの既定値を元にしたかと組で持ち、既定値が変わったら捨てる
  const [textEdit, setTextEdit] = useState<{ base: string; value: string } | null>(null);
  const text = textEdit && textEdit.base === postText ? textEdit.value : postText;
  const setText = (value: string) => setTextEdit({ base: postText, value });
  // Android の回避策(画像だけ共有し、ポスト文はコピーしてもらう)を使うか。
  // X の挙動が戻れば ANDROID_SHARE_IMAGES_ONLY を false にするだけで無効になる。
  const androidImagesOnly = ANDROID_SHARE_IMAGES_ONLY && isAndroidDevice;

  // 画像が用意できたときに加えて、生成に失敗したとき(=ポスト文だけでシェアする)も許可する。
  // 書き出す枚数。sheets が無ければ children の1枚
  const sheetCount = sheets?.length ?? 1;
  const isBatch = sheetCount > 1;

  /*
   * 1枚のときは、画像が作れなくてもポスト文だけで共有させる（手が無くなるより良い）。
   * 複数枚のときはそうしない。何枚目が欠けたのか分からないまま投稿されるより、
   * 作り直してもらう方がよいため、失敗したら共有そのものを止める。
   */
  const canShare = !capturing && (images.length > 0 || (captureFailed && !isBatch));

  // モーダルを閉じるとキャプチャ用DOMは破棄されるため、生成済み画像も捨てる
  // (次に開いたとき、古い内容の画像を共有してしまわないようにする)。
  // 次に開いたときはキャプチャ用DOMも開くアニメーションが終わってから描画し直し、
  // ポスト文は既定値から始める。effect で戻すと閉じる前の状態での描画が一度挟まるので、
  // 前回の開閉を控えておき描画中に戻す
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) {
      setCaptured(null);
      setProgress(null);
      setCaptureMounted(false);
    }
    setTextEdit(null);
  }

  // キャプチャ用DOMは、開くアニメーションが終わってから描画する。
  // アニメーション中に描画すると、その重さで開く動きがカクつく。
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => setCaptureMounted(true), CAPTURE_MOUNT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // シェア画像の生成。撮る条件(captureKey)が変わるたびに撮り直す
  useEffect(() => {
    if (captureKey === null) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const captures: ShareImage[] = [];
        const stamp = Date.now();
        let hasMissing = false;

        // 枚数ぶんを順に撮る。並列にすると端末のメインスレッドを奪い合って
        // かえって遅くなるうえ、iOS では canvas を同時に多数持てない。
        for (let index = 0; index < sheetCount; index++) {
          const el = captureRefs.current[index];
          // 撮る対象が無ければ画像は作れない。待ちのまま止まらないよう失敗として扱う。
          if (!el) throw new Error("capture target not found");

          const dataUrl = await Promise.race([
            captureThemedPng(el, {
              targetWidth: captureWidth,
              bare: capture?.bare,
              theme: capture?.theme,
              desiredPixelRatio: capture?.desiredPixelRatio,
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("capture timeout")), CAPTURE_TIMEOUT_MS),
            ),
          ]);

          // 書き出し後に読み込めていない画像が残っていれば、その画像には欠けがある。
          // captureThemedPng が待ちと再試行を終えた後に判定する。
          if (hasUnloadedImages(el)) hasMissing = true;

          // 複数枚のときは順番が分かるよう連番を挟む
          const filename =
            sheetCount > 1
              ? `${filenamePrefix}_${index + 1}_${stamp}.png`
              : `${filenamePrefix}_${stamp}.png`;
          const file = await dataUrlToFile(dataUrl, filename);

          if (cancelled) return;
          captures.push({ dataUrl, filename, file });
          setProgress({ key: captureKey, count: captures.length });
        }

        if (cancelled) return;
        setCaptured({ key: captureKey, images: captures, incomplete: hasMissing, failed: false });
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        // 失敗はプレビュー欄に出し続ける(トーストは消えてしまい、
        // 何が起きたのか分からないまま準備中の表示だけが残ってしまうため)。
        setCaptured({ key: captureKey, images: [], incomplete: false, failed: true });
      }
    }, CAPTURE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // 撮る条件は captureKey にまとめてある(それ以外は撮る中身の参照に使うだけ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureKey]);

  // 上部バーのフリックでモーダルを閉じる。ただしシェアの処理中(busy)は閉じさせない。
  const attachHeader = useModalDragToClose(onClose, { disabled: busy !== null });

  // ポスト文をクリップボードへコピーする。
  // Android では画像だけを共有するため、ここでコピーして X の投稿画面に貼り付けてもらう。
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setTextCopied(true);
      // Android では画像だけを共有してポスト文はコピーで補ってもらうため、
      // コピーも共有導線の一部として同じイベントで数える(method で区別する)。
      sendGAEvent("event", "share", { method: "copy", content_type: filenamePrefix });
      addToast({ title: "ポスト文をコピーしました", color: "success", timeout: 2000 });
      setTimeout(() => setTextCopied(false), 1500);
    } catch {
      addToast({ title: "コピーに失敗しました", color: "danger", timeout: 3000 });
    }
  };

  // 注意: navigator.share() の呼び出し前に await を挟むとユーザーアクティベーションが
  // 切れるため、この関数内では shareRecord() の前で await しないこと。
  const handleShare = async () => {
    if (!canShare) return;
    setBusy("share");
    try {
      // 画像の生成に失敗した場合は画像を渡さない。共有処理はその場合
      // ポスト文だけの共有にフォールバックする(ボタンの表記もそうなっている)。
      const shareImages = images.length > 0 && !captureFailed ? images : [];
      await shareImagesWithText(shareImages, text, {
        analyticsLabel: filenamePrefix,
        imagesOnlyOnAndroid: androidImagesOnly,
      });
    } catch (e) {
      console.error(e);
      addToast({ title: "共有に失敗しました", color: "danger", timeout: 5000 });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        // シェアの処理中(busy)は閉じさせない
        onOpenChange={() => {
          if (busy !== null) return;
          onOpenChange();
        }}
        placement="bottom"
        hideCloseButton
        isDismissable={false}
        scrollBehavior="inside"
        // min() でシート高の上限を可視領域(--visual-viewport-height)にし、
        // iOS でキーボード表示中に入力欄がキーボードの裏に隠れるのを防ぐ
        className="h-[min(calc(100dvh-104px),var(--visual-viewport-height,100dvh))] max-h-[min(calc(100dvh-104px),var(--visual-viewport-height,100dvh))] mt-26 my-0 rounded-b-none sm:max-w-full lg:max-w-lg"
        classNames={closingPassthroughClassNames(isOpen)}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader
                ref={attachHeader}
                className="flex cursor-grab touch-none flex-col gap-1 px-4 pb-3 pt-3"
              >
                <div className="mx-auto mb-1 h-1 w-32 rounded-full bg-default-300" />
                <div className="flex items-center gap-2">
                  <LuShare2 className="text-primary" />
                  シェア
                </div>
              </ModalHeader>
              <ModalBody className="gap-5 px-4 pb-1">
                <p className="text-tiny text-default-500">{description}</p>

                <div className="flex flex-col gap-2">
                  {/* ラベルとコピーボタン。とくに Android では画像だけを共有するため、
                      ここでポスト文をコピーして貼り付けてもらう。 */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold">ポスト文</span>
                    <Button
                      size="sm"
                      variant="flat"
                      className="h-7 min-w-0 px-2.5"
                      startContent={
                        textCopied ? (
                          <LuCheck className="h-3.5 w-3.5" />
                        ) : (
                          <LuCopy className="h-3.5 w-3.5" />
                        )
                      }
                      onPress={handleCopyText}
                    >
                      {textCopied ? "コピーしました" : "コピー"}
                    </Button>
                  </div>

                  {/* Android では画像とポスト文を一緒に共有できない(X が片方を捨てる)ため、
                      画像のみ共有することと、ポスト文はコピーして貼り付ける必要があることを伝える。 */}
                  {androidImagesOnly && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-warning-200 bg-warning-50 px-3 py-2.5">
                      <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" />
                      <p className="min-w-0 flex-1 text-[0.6875rem] leading-relaxed text-warning-700">
                        Android
                        では画像とポスト文を一緒に共有できないため、画像のみ共有します。
                        上の「コピー」でポスト文をコピーし、X
                        の投稿画面に貼り付けてください。
                      </p>
                    </div>
                  )}

                  {/* iOSでは<textarea>の既定のoverflowがautoのため、モーダルのスクロール抑止
                      (react-ariaのpreventScrollMobileSafari)が「テキストエリア自身がスクロール
                      可能」と誤判定し、内容が収まっていてもtouchmoveをpreventDefaultしてしまう。
                      overflowを持たせず内容の高さまで伸ばし、スクロールはモーダル本体に任せる。 */}
                  <Textarea
                    aria-label="ポスト文"
                    value={text}
                    onValueChange={setText}
                    onFocus={(e) => scrollIntoViewAfterKeyboard(e.currentTarget)}
                    minRows={5}
                    maxRows={999}
                    classNames={{ input: "overflow-hidden" }}
                  />
                </div>

                {/* シェアされる画像のプレビュー */}
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-bold">プレビュー</span>

                  {/* 画像に欠けがある場合の注意書き。
                      シェア自体は止めない(欠けても内容は正しく、止めると共有する手段が
                      無くなるため)。作り直すか、このままシェアするかは利用者に委ねる。 */}
                  {images.length > 0 && incomplete && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-warning-200 bg-warning-50 px-3 py-2.5">
                      <LuTriangleAlert className="h-4 w-4 shrink-0 text-warning-600" />
                      <div
                        role="alert"
                        className="min-w-0 flex-1 text-[0.6875rem] leading-relaxed text-warning-700"
                      >
                        画像を読み込めなかったため、ポケモンのアイコンが欠けています
                      </div>
                      <Button
                        size="sm"
                        variant="flat"
                        color="warning"
                        className="shrink-0"
                        startContent={<LuRefreshCw className="h-3 w-3" />}
                        onPress={() => setRegenSeq((n) => n + 1)}
                      >
                        再生成
                      </Button>
                    </div>
                  )}

                  {captureFailed ? (
                    // 生成に失敗したまま準備中の表示を続けると、待てば直るのか分からず
                    // 手詰まりになる。何が起きたかを示し、作り直す手段を置く。
                    <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-xl border border-divider bg-content2 px-4">
                      <LuImageOff className="h-6 w-6 text-default-400" />
                      <p
                        role="alert"
                        className="text-center text-[0.6875rem] text-default-500"
                      >
                        画像を生成できませんでした
                        <br />
                        {isBatch
                          ? "作り直してからシェアしてください"
                          : "作り直すか、ポスト文だけでシェアできます"}
                      </p>
                      <Button
                        size="sm"
                        variant="flat"
                        startContent={<LuRefreshCw className="h-3 w-3" />}
                        onPress={() => setRegenSeq((n) => n + 1)}
                      >
                        作り直す
                      </Button>
                    </div>
                  ) : images.length === 0 ? (
                    // 生成中は枠内にスピナーを表示(画像の縦横比は不定なので固定高さの枠にする)
                    <div className="flex h-52 flex-col items-center justify-center gap-2 rounded-xl border border-divider bg-content2">
                      <Spinner size="sm" />
                      <span className="text-[0.6875rem] text-default-400">
                        {sheetCount > 1
                          ? `画像を生成しています（${capturedCount}/${sheetCount}）`
                          : "画像を生成しています"}
                      </span>
                    </div>
                  ) : (
                    // 撮り直している間も直前の画像を残したまま、上に重ねて知らせる
                    <div className="relative">
                      {/* 実際の書き出し画像。プレビューなので枠幅に収めて縮小表示する。
                          1枚なら幅いっぱい、複数枚は高さを揃えて横に並べる。 */}
                      {images.length === 1 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={images[0].dataUrl}
                          alt="シェア画像のプレビュー"
                          // 大きな画像のデコードでスクロールが止まらないようにする
                          decoding="async"
                          className="h-auto w-full rounded-xl border border-divider bg-content2"
                        />
                      ) : (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {images.map((img, index) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={img.filename}
                              src={img.dataUrl}
                              alt={`シェア画像のプレビュー ${index + 1}枚目`}
                              decoding="async"
                              className="h-52 w-auto shrink-0 rounded-xl border border-divider bg-content2"
                            />
                          ))}
                        </div>
                      )}
                      {capturing && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-content1/60">
                          <Spinner size="sm" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ModalBody>
              {/* 「シェアする」ボタンはモーダル下部に固定する。プレビュー画像が縦に長いと
                  スクロール範囲の外へ押し出されて見えなくなるため、本文(スクロール領域)から
                  出してフッターに置き、常に見える・押せる状態にする。
                  画像の準備が終わるまではスピナー付きで無効化し、準備完了までシェアさせない。 */}
              <ModalFooter className="share-modal-footer border-t border-divider px-4 pt-3 pb-3">
                <Button
                  className="w-full"
                  color="primary"
                  size="lg"
                  startContent={busy !== "share" && canShare && <LuShare2 />}
                  // 生成中はスピナー。失敗して共有できないときは、回っていると
                  // 待てば直るように見えるため、無効化だけにする。
                  isLoading={busy === "share" || (!canShare && !captureFailed)}
                  isDisabled={busy !== null || !canShare}
                  onPress={handleShare}
                >
                  {captureFailed
                    ? isBatch
                      ? "画像を作り直してください"
                      : "テキストだけでシェア"
                    : canShare
                      ? "シェアする"
                      : "画像を準備しています"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* キャプチャ用の画面外DOM。
          開くアニメーションが終わってから描画する(CAPTURE_MOUNT_DELAY_MS の理由を参照) */}
      {isOpen && captureMounted && (
        <div
          className="pointer-events-none fixed left-[-10000px] top-0"
          aria-hidden="true"
        >
          {sheets ? (
            sheets.map((sheet, index) => (
              <div
                key={sheet.key}
                ref={(el) => {
                  captureRefs.current[index] = el;
                }}
                style={{ width: captureWidth }}
              >
                {sheet.node}
              </div>
            ))
          ) : (
            <div
              ref={(el) => {
                captureRefs.current[0] = el;
              }}
              style={{ width: captureWidth }}
            >
              {children?.(captureWidth)}
            </div>
          )}
        </div>
      )}
    </>
  );
}
