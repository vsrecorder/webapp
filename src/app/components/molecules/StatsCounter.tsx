"use client";

import { useEffect, useRef, useState } from "react";

type StatsCounterProps = {
  value: number;
  // カウントアップにかける時間（ミリ秒）
  duration?: number;
};

export default function StatsCounter({ value, duration = 1500 }: StatsCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const spanRef = useRef<HTMLSpanElement>(null);
  // 一度アニメーションしたら再実行しないためのフラグ
  const hasAnimated = useRef(false);

  useEffect(() => {
    const node = spanRef.current;
    if (!node) return;

    // 要素が画面内に入ったらカウントアップを開始する
    const startAnimation = () => {
      if (hasAnimated.current) return;
      hasAnimated.current = true;

      let rafId = 0;
      let startTime: number | null = null;

      const tick = (now: number) => {
        if (startTime === null) startTime = now;
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutCubic で終盤を滑らかに減速させる
        const eased = 1 - Math.pow(1 - progress, 3);

        setDisplayValue(Math.round(value * eased));

        if (progress < 1) {
          rafId = requestAnimationFrame(tick);
        }
      };

      rafId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafId);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          startAnimation();
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [value, duration]);

  return <span ref={spanRef}>{displayValue.toLocaleString("ja-JP")}</span>;
}
