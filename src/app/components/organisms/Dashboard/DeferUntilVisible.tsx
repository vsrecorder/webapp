"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

/*
 * 画面に近づくまで中身をマウントせず、代わりに骨格を出しておく箱。
 *
 * ホームは十数枚のパネルを縦に並べるが、初期表示で見えているのは上の 3〜4 枚だけ。
 * それでもハイドレーション直後に全パネルが一斉にマウントされ、画面外のパネルの取得
 * (カレンダー・週次デッキ使用率・最近の記録など)まで同時に飛んでいた。
 * 本番ビルド・CPU 4x の実測(2026-09-08)では、ホームはハイドレーション後に API が 11 本並び、
 * 見えている範囲の最後のパネルが出るまで 5.9 秒。下部ナビで別ページへ移る操作も、
 * この忙しさに巻き込まれて画面が動くまで 350〜430ms かかっていた(他ページ起点は 130ms)。
 *
 * chart.js を抱えるパネル(DashboardChartPanels)は同じ理由で既に遅延している。
 * あちらは JS チャンクごと遅らせるため import() を伴うが、こちらはマウントだけを遅らせる
 * (JS は初期バンドルに入ったまま)。取得と初期化のコストを画面に入るまで払わないのが目的。
 *
 * 骨格(fallback)は実体と同じ寸法のものを渡すこと。高さ 0 だと画面内判定が常に真になって
 * 遅延が効かず、実体と違う高さだと差し替わったときに下がずれる。
 */

// 画面に入るどれくらい手前でマウントを始めるか。モバイルの画面高(約 840px)に近い距離を
// 先読みして、差し替えを画面外で終わらせる(DashboardChartPanels と同じ値)
export const DEFER_ROOT_MARGIN = "600px";

type Props = {
  fallback: ReactNode;
  children: ReactNode;
  // 観測用の箱に付けるクラス。実体を包んでいた要素の間隔指定(flex-col gap-2 など)をここへ移す
  className?: string;
};

export default function DeferUntilVisible({ fallback, children, className }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { rootMargin: DEFER_ROOT_MARGIN },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  // display:contents だとレイアウトボックスを持たず IntersectionObserver が働かないため、div で包む
  return (
    <div ref={ref} className={className}>
      {isVisible ? children : fallback}
    </div>
  );
}
