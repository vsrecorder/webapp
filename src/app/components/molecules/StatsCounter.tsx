"use client";

import { useEffect, useRef, useState } from "react";

type StatsCounterProps = {
  value: number;
  // カウントアップにかける時間（ミリ秒）
  duration?: number;
};

// 1フレームとして認める最大間隔(ms)。これを超えた分は「描けなかった時間」とみなし、
// 進捗に加算しない。60fpsで16.7ms、30fpsで33.3msなので、実際にコマ落ちしている場合だけ
// 引っかかる値にしている。
const MAX_FRAME_MS = 50;

export default function StatsCounter({ value, duration = 1500 }: StatsCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const spanRef = useRef<HTMLSpanElement>(null);
  // 現在表示している値。アニメーションの開始点として使う（前回値からカウントアップさせる）
  const displayValueRef = useRef(0);
  // 一度でも画面内に入ってカウントアップを開始したか
  const hasEnteredView = useRef(false);

  useEffect(() => {
    const node = spanRef.current;
    if (!node) return;

    let rafId = 0;

    // 現在の表示値から value までカウントアップする
    //
    // 進捗は「開始からの実時間」ではなく、実際に描けたフレーム間隔の積み上げで決める。
    // 実時間で出すと、メインスレッドが詰まって描画が止まっている間も時間だけ進み、
    // 空いた瞬間に止まっていた分がまとめて反映されて一気に跳ぶ（「一度止まってから
    // またカウントされる」見え方になる）。上限を超えた間隔は「描けなかった時間」として
    // 捨てることで、詰まりを跳ねではなく一時停止に変え、止まった続きから再開させる。
    const animate = () => {
      const fromValue = displayValueRef.current;
      const toValue = value;
      let elapsed = 0;
      let lastTime: number | null = null;

      const tick = (now: number) => {
        if (lastTime !== null) elapsed += Math.min(now - lastTime, MAX_FRAME_MS);
        lastTime = now;

        const progress = Math.min(elapsed / duration, 1);
        // easeOutCubic で終盤を滑らかに減速させる
        const eased = 1 - Math.pow(1 - progress, 3);

        const current = Math.round(fromValue + (toValue - fromValue) * eased);
        displayValueRef.current = current;
        setDisplayValue(current);

        if (progress < 1) {
          rafId = requestAnimationFrame(tick);
        }
      };

      rafId = requestAnimationFrame(tick);
    };

    // 既に画面内に入っている場合は、value の変更に追随して即カウントアップする
    // （期間フィルタ切り替えなどで値が変わっても表示が固定されないようにする）
    if (hasEnteredView.current) {
      animate();
      return () => cancelAnimationFrame(rafId);
    }

    // 初回は要素が画面内に入ったタイミングでカウントアップを開始する
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          hasEnteredView.current = true;
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [value, duration]);

  return <span ref={spanRef}>{displayValue.toLocaleString("ja-JP")}</span>;
}
