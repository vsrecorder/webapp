"use client";

import { useState } from "react";

import { Image, Skeleton } from "@heroui/react";
import { ModalContent, ModalBody } from "@heroui/react";

import { Modal } from "@app/components/atoms/AppModal";

import FetchError from "@app/components/molecules/FetchError";

type Props = {
  // 見せるカードの名前(代替テキストと、取れなかったときの文言に使う)
  cardName: string;
  // カード画像の URL。取得中は null、内訳に見当たらなかったときも null
  imageUrl: string | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  isOpen: boolean;
  onClose: () => void;
};

/*
 * カード 1 枚の画像を中央に大きく見せるモーダル。
 *
 * カード名だけを出している場所(類似している入賞デッキの差分カード)から、タップで
 * そのカードの絵を確かめるために使う。出し方・大きさ・画像をタップして閉じる操作は、
 * カードリスト(DeckCardDetailRow)のカードをタップしたときのモーダルと同じにしてある。
 *
 * カードリストと違うのは、画像 URL が手元に無いところ。カード名からは引けないので
 * 呼び出し側が useDeckCardImage でデッキの内訳を経由して引く。その待ちのあいだは
 * カードと同じ形の骨格を出す(カードリストは内訳を持っているので待ちが無い)。
 */
export default function CardImageZoomOverlay({
  cardName,
  imageUrl,
  loading,
  error,
  onRetry,
  isOpen,
  onClose,
}: Props) {
  /*
   * 画像が描かれるまで骨格を重ねておくための決着。別のカードに変わったら戻す。
   * effect で戻すと「前のカードの画像を読み終わったまま」の描画が一度挟まるので、
   * 前回の URL を控えておき、描画中に変化を見て戻す
   */
  const [imageLoaded, setImageLoaded] = useState(false);
  /*
   * 画像を読めなかった(URL はあるが 404 など)。骨格を止めて文言に切り替えるために使う。
   * これが無いと、いつまでも読み込み中に見える。
   *
   * HeroUI Image は onLoad / onError を img ではなく内部の detached な Image に張るので、
   * jsdom では発火しない(テストで縛れない)。実ブラウザで 404 の URL を渡して確認してある
   */
  const [imageFailed, setImageFailed] = useState(false);
  const [lastImageUrl, setLastImageUrl] = useState(imageUrl);
  if (lastImageUrl !== imageUrl) {
    setLastImageUrl(imageUrl);
    setImageLoaded(false);
    setImageFailed(false);
  }

  return (
    <Modal
      isOpen={isOpen}
      size={"sm"}
      placement="center"
      hideCloseButton
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      onClose={() => {}}
      classNames={{
        base: "sm:max-w-full bg-transparent shadow-none border-none",
      }}
    >
      <ModalContent>
        {(close) => (
          <ModalBody>
            {error ? (
              <FetchError
                message="カード画像を取得できませんでした"
                onRetry={onRetry}
                variant="stack"
              />
            ) : (!loading && !imageUrl) || imageFailed ? (
              <div className="rounded-xl bg-content1 px-3 py-4 text-center text-small text-default-600">
                「{cardName}」のカード画像が見つかりませんでした
              </div>
            ) : (
              /*
               * カードと同じ形(63:88)の枠を先に取り、画像が来るまで骨格を重ねる。
               * 画像の大きさが決まるまで枠を持たないと、URL を引くあいだ・画像が届くまでの
               * 二段でモーダルの大きさが変わる(カードリストは内訳も画像も持っているので
               * その待ちが無い)。角丸は骨格と画像で同じ値にする。
               *
               * 幅には上限が要る。このモーダルは sm 以上で幅の制限を外してある
               * (classNames.base の sm:max-w-full)ので、枠を幅なりに広げると
               * デスクトップでカードが 1184×1654 まで伸び、画面の上下にはみ出す(実測)。
               * カード 1 枚ぶんの大きさ(24rem)と、画面の高さに収まる幅の小さいほうを採る。
               * 横向きのスマホのように縦が短い画面では高さ側が先に効く
               */
              <div className="relative mx-auto aspect-63/88 w-full max-w-[min(24rem,calc(78svh*63/88))]">
                {!imageLoaded && <Skeleton className="absolute inset-0 rounded-[20px]" />}
                {imageUrl && (
                  <Image
                    radius="none"
                    shadow="none"
                    alt={cardName}
                    src={imageUrl}
                    /*
                     * 骨格を外すのと画像が出るのを同じ瞬間にする。
                     *
                     * HeroUI Image は既定で、読み終わった時点で自前の下地(wrapper の地色)を
                     * 外してから img を 280ms かけて opacity 0 → 1 でフェードさせる。
                     * その間は下地も画像も無い透明な枠になり、背面のシートが透けて
                     * 「一瞬すけてからじわっと出る」ちらつきになる(実測: 骨格が消えてから
                     * 画像が見え始めるまで空白)。カードリストは画像を先読みしてあって
                     * 読み込み待ちが無いので、この隙間が表に出ない。
                     * 下地は枠側の骨格で持つので、HeroUI 側の下地も要らない
                     */
                    disableAnimation
                    disableSkeleton
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageFailed(true)}
                    onClick={close}
                    // HeroUI Image は img を max-width:fit-content のラッパーで包むので、
                    // ラッパーごと枠の幅へ広げないと画像が本来の大きさのまま出る
                    classNames={{ wrapper: "w-full !max-w-full" }}
                    className="w-full rounded-[20px] cursor-pointer"
                  />
                )}
              </div>
            )}
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
}
