"use client";

import Image from "next/image";

import { ModalContent, useDisclosure } from "@heroui/react";

import { Modal } from "@app/components/atoms/AppModal";

type PhoneMockProps = {
  src: string;
  alt: string;
  rotateClass?: string;
  sizeClass?: string;
};

export default function PhoneMock({
  src,
  alt,
  rotateClass = "",
  sizeClass = "w-44",
}: PhoneMockProps) {
  // タップでモーダル表示するための開閉状態
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${alt}の画像を拡大表示`}
        className={`${sizeClass} shrink-0 cursor-pointer rounded-4xl border-[6px] border-neutral-800 bg-neutral-800 shadow-2xl overflow-hidden dark:border-neutral-700 dark:bg-neutral-700 transition-transform hover:scale-105 ${rotateClass} lg:rotate-0`}
      >
        <div className="relative aspect-864/1920 w-full overflow-hidden rounded-3xl bg-white">
          {/* fill ではなく実寸(864x1920)を渡し、枠いっぱいに広げるのはCSSで行う。
              fill だと <img> 自身に width/height 属性が付かないため、遅延読み込み時に
              「寸法未指定の画像」としてブラウザ(DevTools)に警告される。 */}
          <Image
            src={src}
            alt={alt}
            width={864}
            height={1920}
            unoptimized
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        </div>
      </button>

      <Modal
        size="xs"
        placement="center"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        classNames={{
          // 左右に余白を残すため最大幅を絞り、横マージンを確保する
          base: "bg-transparent shadow-none max-w-[240px] mx-12 overflow-visible",
          // 画像に隠れないよう、ボタンを画像の上部外側に配置して前面に出す
          closeButton: "z-50 -top-12 -right-6 text-2xl text-white hover:bg-white/20",
        }}
      >
        <ModalContent>
          {() => (
            <div className="relative aspect-864/1920 w-full overflow-hidden rounded-3xl">
              <Image
                src={src}
                alt={alt}
                width={864}
                height={1920}
                unoptimized
                className="absolute inset-0 h-full w-full object-contain"
              />
            </div>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
