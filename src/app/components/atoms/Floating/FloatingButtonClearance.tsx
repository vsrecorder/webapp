"use client";

import { useEffect, useRef, useState } from "react";

/**
 * モバイルのフローティングボタン(＋ / トップへ戻る)に一覧の最後のカードが
 * 隠れないための下部クリアランス。
 *
 * ただし固定の余白(pb-35 など)にすると、デッキが少なくコンテンツが1画面に
 * 収まっているときでも余白ぶんだけ画面を超え、「空白へスクロールできてしまう」。
 * そこで、コンテンツがビューポート(svh)を実際に超えるときだけ余白を出す。
 *   - 収まっているとき: 高さ0。最後のカードはボタンより上にあり被らないので余白不要。
 *   - 超えているとき  : 140px(=旧 pb-35)。スクロール末尾で最後のカードがボタンに隠れない。
 *
 * lg 以上はフローティングボタンが無い(lg:hidden)ため常に高さ0。
 */
export default function FloatingButtonClearance() {
  // クリアランス要素自身。文書内での絶対Y位置をコンテンツ末尾の高さとして使う。
  const ref = useRef<HTMLDivElement>(null);
  // 100svh の実ピクセル値を測るためのプローブ。svh はURLバーの開閉で変化しない安定値なので、
  // これを基準にすることで window.innerHeight を使ったときのバー開閉による余白の発振を防ぐ。
  const probeRef = useRef<HTMLDivElement>(null);
  const [needsClearance, setNeedsClearance] = useState(false);

  useEffect(() => {
    const el = ref.current;
    const probe = probeRef.current;
    if (!el || !probe) return;

    const measure = () => {
      // コンテンツ末尾の絶対Y位置。自身より下のクリアランス高には依存しないため、
      // 余白のON/OFFで測定値が揺れず発振しない。
      const contentBottom = el.getBoundingClientRect().top + window.scrollY;
      const svh = probe.offsetHeight;
      setNeedsClearance(contentBottom > svh);
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
      <div ref={ref} aria-hidden className={`lg:hidden ${needsClearance ? "h-35" : "h-0"}`} />
    </>
  );
}
