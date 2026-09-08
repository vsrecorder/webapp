"use client";

import { RefObject, useEffect, useState } from "react";

import { useClientValue } from "@app/hooks/useClientValue";

function isIntersectionObserverMissing(): boolean {
  return typeof IntersectionObserver === "undefined";
}

/*
 * 要素が一度でも表示領域に入ったかを返す。
 * 一覧の各カードで「見えたときだけ追加の通信(ACE SPEC の取得など)を始める」ために使う。
 * 一度 true になったら戻さない(画面外へ出ても取得し直さない)。
 */
export function useInView(ref: RefObject<Element | null>, rootMargin: string = "200px"): boolean {
  const [inView, setInView] = useState(false);
  // IntersectionObserver の無い環境では観測できないので、最初から見えている扱いにする
  const observerMissing = useClientValue(isIntersectionObserverMissing, false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView || observerMissing) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [ref, rootMargin, inView, observerMissing]);

  return inView || observerMissing;
}
