"use client";

import { useState } from "react";

import { Skeleton } from "@heroui/react";
import { ModalContent, ModalBody } from "@heroui/react";

import { Modal } from "@app/components/atoms/AppModal";

import { cardImageProps } from "@app/utils/cardImage";

type Props = {
  // 見せるカードの名前(代替テキストと、出せなかったときの文言に使う)
  cardName: string;
  // カード画像の URL。無ければ null(見つからなかったことを伝える)
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
};

/*
 * カード 1 枚の画像を中央に大きく見せるモーダル。
 *
 * カード名だけを出している場所(類似している入賞デッキの差分カード)から、タップで
 * そのカードの絵を確かめるために使う。出し方・大きさ・画像をタップして閉じる操作は、
 * カードリスト(DeckCardDetailRow)のカードをタップしたときのモーダルと同じにしてある。
 * 画像の URL は呼び出し側が持っている(バトラボが差分カードに添えてくる)ので、
 * ここで取りに行くものは無い。画像が届くまでの間だけ、カードと同じ形の骨格を出す。
 * 画像は next/image の最適化 API を通す(utils/cardImage.ts。公式サイトの 233KB → 53KB)
 */
export default function CardImageZoomOverlay({ cardName, imageUrl, isOpen, onClose }: Props) {
  /*
   * 画像が描かれるまで骨格を重ねておくための決着。別のカードに変わったら戻す。
   * effect で戻すと「前のカードの画像を読み終わったまま」の描画が一度挟まるので、
   * 前回の URL を控えておき、描画中に変化を見て戻す
   */
  const [imageLoaded, setImageLoaded] = useState(false);
  /*
   * 画像を読めなかった(URL はあるが 404 など)。骨格を止めて文言に切り替えるために使う。
   * これが無いと、いつまでも読み込み中に見える
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
            {!imageUrl || imageFailed ? (
              <div className="rounded-xl bg-content1 px-3 py-4 text-center text-small text-default-600">
                「{cardName}」のカード画像が見つかりませんでした
              </div>
            ) : (
              /*
               * カードと同じ形(63:88)の枠を先に取り、画像が来るまで骨格を重ねる。
               * 画像の大きさが決まるまで枠を持たないと、画像が届いた時点でモーダルの大きさが
               * 変わる(カードリストは画像を先読みしてあるのでその待ちが無い)。
               * 角丸は骨格と画像で同じ値にする。
               *
               * 幅には上限が要る。このモーダルは sm 以上で幅の制限を外してある
               * (classNames.base の sm:max-w-full)ので、枠を幅なりに広げると
               * デスクトップでカードが 1184×1654 まで伸び、画面の上下にはみ出す(実測)。
               * カード 1 枚ぶんの大きさ(24rem)と、画面の高さに収まる幅の小さいほうを採る。
               * 横向きのスマホのように縦が短い画面では高さ側が先に効く
               */
              <div className="relative mx-auto aspect-63/88 w-full max-w-[min(24rem,calc(78svh*63/88))]">
                {!imageLoaded && <Skeleton className="absolute inset-0 rounded-[20px]" />}
                {/*
                 * 素の <img> で、読み終わるまで伏せておき、骨格を外すのと画像が出るのを同じ瞬間にする。
                 * HeroUI Image は読み終わった時点で自前の下地を外してから img を 280ms かけて
                 * フェードさせるため、その間だけ下地も画像も無い透明な枠になり、背面のシートが
                 * 透けて「一瞬すけてからじわっと出る」ちらつきになっていた(実測)。
                 * 画像タップでも閉じる(カードリストのモーダルと同じ)
                 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  {...cardImageProps(imageUrl, cardName, "modal", "eager")}
                  alt={cardName}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageFailed(true)}
                  onClick={close}
                  className={`h-auto w-full rounded-[20px] cursor-pointer ${
                    imageLoaded ? "" : "opacity-0"
                  }`}
                />
              </div>
            )}
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
}
