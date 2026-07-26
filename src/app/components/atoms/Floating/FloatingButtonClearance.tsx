"use client";

import { useEffect, useRef, useState } from "react";

// フローティングボタン(＋ / トップへ戻る)に最下部のコンテンツが隠れないよう、
// 画面下端から確保したい余白(px)。= 旧 pb-35 / h-35。
const CLEARANCE_PX = 140;

/**
 * モバイルのフローティングボタン(＋ / トップへ戻る)に一覧の最後のカードが
 * 隠れないための下部クリアランス。
 *
 * ただし固定の余白(pb-35 など)にすると、件数が少なくコンテンツが画面下端から
 * 十分離れているときでも余白ぶんだけ画面を超え、「空白へスクロールできてしまう」。
 * そこで、コンテンツ末尾がフローティング領域(画面下端から CLEARANCE_PX)に
 * 掛かるときだけ、足りない分の余白を出す。
 *   - 画面下端まで CLEARANCE_PX 以上空いているとき: 高さ0。ボタンと被らないので余白不要。
 *   - 掛かっているとき: 不足分だけ(最大 CLEARANCE_PX)。スクロール末尾でも
 *     最後のカードがボタンに隠れず、かつ余分な空白は増やさない。
 *
 * コンテンツがビューポートを超えるときだけでは、記録一覧の Tonamel /
 * 自由形式タブのように件数が少なく1画面に収まるケースで余白が出ず、
 * 最後のカードがボタンに隠れてしまうため、この判定にしている。
 *
 * lg 以上はフローティングボタンが無い(lg:hidden)ため常に高さ0。
 */
export default function FloatingButtonClearance() {
  // クリアランス要素自身。文書内での絶対Y位置をコンテンツ末尾の高さとして使う。
  const ref = useRef<HTMLDivElement>(null);
  // 100svh の実ピクセル値を測るためのプローブ。svh はURLバーの開閉で変化しない安定値なので、
  // これを基準にすることで window.innerHeight を使ったときのバー開閉による余白の発振を防ぐ。
  const probeRef = useRef<HTMLDivElement>(null);
  const [clearance, setClearance] = useState(0);

  useEffect(() => {
    const el = ref.current;
    const probe = probeRef.current;
    if (!el || !probe) return;

    const measure = () => {
      // コンテンツ末尾の絶対Y位置。自身より下のクリアランス高には依存しないため、
      // 余白のON/OFFで測定値が揺れず発振しない。
      const contentBottom = el.getBoundingClientRect().top + window.scrollY;
      const svh = probe.offsetHeight;
      // 画面下端からコンテンツ末尾までの空き。ビューポートを超えていれば負になる。
      const gap = svh - contentBottom;
      // 空きが CLEARANCE_PX に満たない分だけを余白として足す。
      // (超えているときは gap<=0 なので上限の CLEARANCE_PX になる)
      setClearance(Math.min(CLEARANCE_PX, Math.max(0, CLEARANCE_PX - gap)));
    };

    measure();
    // 一覧の増減・追加読み込み・カード高の変化(きずな等)に追従する。
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    // 端末回転など svh 自体が変わる場合に追従する。
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <>
      {/* svh 計測用の不可視プローブ(レイアウトに影響しない) */}
      <div
        ref={probeRef}
        aria-hidden
        className="pointer-events-none invisible fixed top-0 left-0 w-0 h-svh"
      />
      <div ref={ref} aria-hidden className="lg:hidden" style={{ height: clearance }} />
    </>
  );
}
