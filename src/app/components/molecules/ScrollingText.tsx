"use client";

import { useRef, useEffect, useState } from "react";

type Props = {
  text: string;
  className?: string;
  animationClass?: string;
};

export default function ScrollingText({ text, className, animationClass = "animate-marquee" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = measureRef.current;
    if (!container || !textEl) return;

    const check = () => {
      setShouldScroll(textEl.scrollWidth > container.clientWidth);
    };
    check();

    // window の resize だけでは、リロードボタンのように後から表示状態が変わる
    // 兄弟要素によってコンテナ幅が変化するケースを検知できないため、
    // コンテナ・テキスト双方のサイズ変化を直接監視する
    const observer = new ResizeObserver(check);
    observer.observe(container);
    observer.observe(textEl);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div ref={containerRef} className={`overflow-hidden relative ${className ?? ""}`}>
      {/* 溢れ判定用の不可視要素 */}
      <span ref={measureRef} className="absolute invisible whitespace-nowrap pointer-events-none">
        {text}
      </span>
      {shouldScroll ? (
        <div className={`inline-flex ${animationClass}`}>
          <span className="whitespace-nowrap pr-12">{text}</span>
          <span className="whitespace-nowrap pr-12" aria-hidden="true">{text}</span>
        </div>
      ) : (
        <span className="whitespace-nowrap">{text}</span>
      )}
    </div>
  );
}
