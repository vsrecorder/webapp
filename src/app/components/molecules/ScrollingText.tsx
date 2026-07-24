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

  // 溢れると中身は animate-marquee（will-change:transform の GPU レイヤー）で
  // 指の真下を動き続ける。これが press/click のターゲットになっていると、
  //   ・iOS が「動くレイヤー上のタッチ＝パン開始」とみなして pointercancel を出し、
  //     react-aria の usePress が press を破棄する
  //   ・ネイティブ click のターゲットは押下時と離す時の要素の共通祖先で決まるが、
  //     マーキーは2枚のコピーが流れるため当たる span が入れ替わり不安定になる
  // これらで「タップしても反応しないことがある」が起きる（ヘッダーの対戦環境の
  // 吹き出しが開かない症状）。pointer 透過にしてタップを静止した祖先(button/カード)へ
  // 落とし、動くレイヤーを当たり判定から外す。ScrollingText は全用途で表示専用ラベル。
  return (
    <div
      ref={containerRef}
      className={`overflow-hidden relative pointer-events-none ${className ?? ""}`}
    >
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
