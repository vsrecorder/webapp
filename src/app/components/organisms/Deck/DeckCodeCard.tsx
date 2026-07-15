"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Skeleton } from "@heroui/react";
import { Image } from "@heroui/react";
import { Snippet } from "@heroui/react";

import { LuLayers } from "react-icons/lu";
import { LuX } from "react-icons/lu";

import { DeckCodeType } from "@app/types/deck_code";

type Props = {
  deckcode: DeckCodeType | null;
  // deckcodeが紐づくデッキに登録済みの総バージョン数（取得中はnull）
  // deckcodeがnullのとき、「デッキに既存バージョンがあるか」の判定に使う
  totalVersionCount?: number | null;
  // デッキにバージョンが1件も無いとき、「デッキのバージョンを作成」CTAから呼ばれる
  onCreateVersion?: () => void;
  // デッキに既存バージョンはあるが、このdeckcodeが未選択のとき、
  // 「既存バージョンを使用したバージョンとして登録」CTAから呼ばれる
  onSelectExistingVersion?: () => void;
  // デッキ画像を別所（ギャラリー表示のヒーロー画像）で表示する場合に true。
  // このとき画像を省き、デッキコードのみ描画する。
  hideImage?: boolean;
  // デッキコードを別所（カードリストの下など）へ配置する場合に true。
  // このとき画像のみ描画し、デッキコード欄を省く。
  hideCode?: boolean;
  // デッキ画像タップでの全画面表示を無効化する場合に true。
  // リスト表示のアコーディオン内などでは、画像タップで拡大させたくない。
  disableImageZoom?: boolean;
  // アーカイブしたデッキでは新しいバージョンを作成できないため、
  // バージョン作成CTAはグレーアウトした非活性表示に差し替える
  isArchived?: boolean;
};

export default function DeckCodeCard({
  deckcode,
  totalVersionCount = null,
  onCreateVersion,
  onSelectExistingVersion,
  hideImage = false,
  hideCode = false,
  disableImageZoom = false,
  isArchived = false,
}: Props) {
  const [imageLoaded, setImageLoaded] = useState(false);
  // デッキ画像タップで開く全画面（横向き）表示のオープン状態
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  useEffect(() => {
    if (!deckcode?.code) return;
    const img = new window.Image();
    img.src = `https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`;
  }, [deckcode?.code]);

  // 全画面表示中は背面のスクロールを止め、Escで閉じられるようにする
  useEffect(() => {
    if (!isZoomOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsZoomOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isZoomOpen]);

  if (!deckcode || !deckcode.code) {
    // デッキ自体には既にバージョンが存在する（＝このdeckcode欄が未選択なだけ）場合は、
    // 新規作成ではなく既存バージョンの登録を促す
    if (totalVersionCount !== null && totalVersionCount > 0) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectExistingVersion?.();
          }}
          className="group w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-success/40 bg-success/5 px-4 py-6 transition-colors hover:border-success/70 hover:bg-success/10 active:opacity-80"
        >
          <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center transition-colors group-hover:bg-success/20">
            <LuLayers className="text-xl text-success" />
          </div>
          <div className="font-bold text-tiny text-success">
            バージョンがあります。
            <br />
            使用したバージョンとして登録しよう。
          </div>
          <div className="text-tiny text-default-400 text-center">
            登録済みのバージョンをこの記録に紐づけると
            <br />
            使用したカード構成まで記録できます
          </div>
        </button>
      );
    }

    // アーカイブしたデッキは新しいバージョンを作成できないため、
    // CTAではなくグレーアウトした非活性の案内を出す
    if (isArchived) {
      return (
        <div className="w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-default-200 bg-default-50 px-4 py-6 text-default-300">
          <div className="w-10 h-10 rounded-full bg-default-100 flex items-center justify-center">
            <LuLayers className="text-xl" />
          </div>
          <div className="font-bold text-tiny">バージョンがありません</div>
          <div className="text-tiny text-center">
            アーカイブしたデッキでは
            <br />
            新しいバージョンを作成できません
          </div>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCreateVersion?.();
        }}
        className="group w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-6 transition-colors hover:border-primary/60 hover:bg-primary/10 active:opacity-80"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20">
          <LuLayers className="text-xl text-primary" />
        </div>
        <div className="font-bold text-tiny text-primary">
          デッキのバージョンを作成しよう
        </div>
        <div className="text-tiny text-default-400 text-center">
          デッキコードを登録すると
          <br />
          対戦記録やカード構成を記録できます
        </div>
      </button>
    );
  }

  const imageSrc = `https://xx8nnpgt.user.webaccel.jp/images/decks/${deckcode.code}.jpg`;

  // 画像の中身（スケルトン＋Image）。ズーム有無で共通に使う。
  const deckImageContent = (
    <>
      {!imageLoaded && <Skeleton className="absolute inset-0 rounded-lg" />}
      <Image
        radius="sm"
        shadow="none"
        alt={deckcode.code}
        src={imageSrc}
        className=""
        onLoad={() => setImageLoaded(true)}
      />
    </>
  );

  // disableImageZoom のときは、タップで全画面表示しない素の画像として描画する
  // （リスト表示のアコーディオン内など）。それ以外はタップで拡大するボタンにする。
  const deckImage = disableImageZoom ? (
    <div className="relative w-full aspect-2/1 block">{deckImageContent}</div>
  ) : (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setIsZoomOpen(true);
      }}
      className="relative w-full aspect-2/1 block cursor-zoom-in active:opacity-90 transition-opacity"
      aria-label="デッキ画像を拡大表示する"
    >
      {deckImageContent}
    </button>
  );

  // デッキ画像を90度回転させ、縦画面の高さいっぱいに横長画像を表示する全画面ビュー。
  // 横長(2:1)の画像を回転後に width:100dvh 指定することで、回転前の水平方向が
  // 画面の縦方向へマッピングされ、画面いっぱいの横表示になる。
  // HeroUI Image は max-width が上限で潰れるため、素の img を max-w-none で使う。
  // HeroUI Modal はアニメーション用に transform を持つため、その内側に置いた
  // position:fixed はモーダル基準になり全画面表示にならない。createPortal で
  // body直下へ出してモーダルの外に逃がす。
  const zoomOverlay =
    isZoomOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-9999 flex items-center justify-center bg-black/95"
            onClick={() => setIsZoomOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomOpen(false);
              }}
              className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white active:opacity-70"
              aria-label="閉じる"
            >
              <LuX className="text-2xl" />
            </button>
            {/* 画像タップでも閉じる（背景と同じく戻す動作にする） */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt={deckcode.code}
              className="max-w-none rotate-90 rounded-lg object-contain"
              style={{ width: "100dvh", height: "auto", maxHeight: "100dvw" }}
            />
          </div>,
          document.body,
        )
      : null;

  // デッキ画像を主役に上へ置き、その下にデッキコードを並べる。
  // 画像を別所（ギャラリー表示のヒーロー画像）で見せている場合は hideImage で省く。
  // 記録詳細では使用デッキカード全体が親の onClick（使用デッキ編集モーダル）で
  // 包まれているため、実デッキコード表示のタップが編集モーダルを開かないよう
  // ここでクリックの伝播を止める（画像タップは拡大、コードはコピー用途に限定する）。
  // ただし disableImageZoom（リスト表示のアコーディオン内）では、カードのタップで
  // デッキ詳細モーダルを開くのが期待動作のため、伝播は止めない。
  return (
    <div
      className="flex w-full flex-col gap-2.5"
      onClick={disableImageZoom ? undefined : (e) => e.stopPropagation()}
    >
      {!hideImage && deckImage}

      {!hideCode && (
        <div className="flex min-w-0 items-center justify-center gap-2 rounded-lg bg-default-100 px-3 py-2">
          <span className="shrink-0 text-tiny text-default-500">デッキコード</span>
          <Snippet
            size="sm"
            radius="none"
            timeout={3000}
            disableTooltip={true}
            hideSymbol={true}
            classNames={{ base: "min-w-0 bg-transparent p-0", pre: "truncate" }}
          >
            {deckcode.code}
          </Snippet>
        </div>
      )}

      {zoomOverlay}
    </div>
  );
}
