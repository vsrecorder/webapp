"use client";

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
            ) : !loading && !imageUrl ? (
              <div className="rounded-xl bg-content1 px-3 py-4 text-center text-small text-default-600">
                「{cardName}」のカード画像が見つかりませんでした
              </div>
            ) : imageUrl ? (
              <Image
                radius="none"
                shadow="none"
                alt={cardName}
                src={imageUrl}
                onLoad={() => {}}
                onClick={close}
                className="rounded-[20px] cursor-pointer"
              />
            ) : (
              // 内訳を取りにいっているあいだ。カードと同じ形・同じ角丸で場所を取っておく
              <Skeleton className="aspect-63/88 w-full rounded-[20px]" />
            )}
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
}
