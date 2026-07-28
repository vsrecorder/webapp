"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { Spinner } from "@heroui/spinner";

/*
 * 画面全体を覆うローディング表示（画面ロック）。
 *
 * 「裏で一覧が伸び縮みする」「勝手にスクロールする」といった、処理中の
 * 落ち着かない動きを見せず、その間の操作も受け付けないための目隠しに使う。
 *
 * 注意: html/body の overflow は触らない。overflow:hidden にするとビューポート自体が
 * スクロール不能になり、覆っている最中に行う window.scrollTo（自動スクロール）まで
 * 効かなくなるため。代わりに、覆い自身が touchmove / wheel を止めることで
 * 「ユーザーのスクロールだけ」を封じる。
 *
 * React の onTouchMove / onWheel はパッシブリスナとして登録され preventDefault() が
 * 効かないため、ref から非パッシブで直接登録する。
 */
type Props = {
  // スピナーの下に出す説明文（省略時はスピナーのみ）
  label?: string;
};

export default function ScreenLockLoading({ label }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const block = (e: Event) => {
      if (e.cancelable) e.preventDefault();
    };

    node.addEventListener("touchmove", block, { passive: false });
    node.addEventListener("wheel", block, { passive: false });

    return () => {
      node.removeEventListener("touchmove", block);
      node.removeEventListener("wheel", block);
    };
  }, []);

  if (typeof document === "undefined") return null;

  // モーダル（HeroUI）より前面に出したいので body 直下へポータルし、z-index も上回らせる。
  return createPortal(
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      // body 直下へ portal しているため、この覆いへのタップは react-aria から見ると
      // 「モーダルの外側」になる（判定は document のキャプチャで動くので伝播も止められない）。
      // 覆いが消える直前にモーダルが開いていると、そのタップでモーダルまで閉じてしまうため、
      // top-layer 属性で外側クリック判定から除外する。
      data-react-aria-top-layer="true"
      style={{ zIndex: 9999 }}
      className="fixed inset-0 flex touch-none flex-col items-center justify-center gap-3 overscroll-none bg-background/80 backdrop-blur-sm"
    >
      <Spinner size="lg" />
      {label && <p className="text-tiny font-bold text-default-500">{label}</p>}
    </div>,
    document.body,
  );
}
