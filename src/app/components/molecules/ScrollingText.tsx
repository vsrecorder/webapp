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
    const check = () => {
      const container = containerRef.current;
      const textEl = measureRef.current;
      if (container && textEl) {
        setShouldScroll(textEl.scrollWidth > container.clientWidth);
      }
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
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
