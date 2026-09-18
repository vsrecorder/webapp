"use client";

import { useEffect, useRef, useState } from "react";

import {
  BOTTOM_BANNER_RESIZE_EVENT,
  readBottomBannerHeight,
} from "@app/utils/bottomBannerHeight";

/*
 * フローティングボタンにコンテンツが隠れないよう、画面下端から確保したい余白。
 *
 * 使う画面ごとにボタンの構成は違うが、いずれも上端は同じ高さに揃っている。
 * 下部ナビが塞ぐぶん(--mobile-nav-height)を起点に、その上へ:
 *   一覧(記録 / デッキ)  … 浮かせ 1rem + 「トップへ戻る」3rem + gap-3 0.75rem + 「＋」3rem
 *   記録詳細            … 浮かせ 1rem + 3点メニュー 3rem + gap-3 0.75rem + シェア 3rem
 * どちらも 7.75rem。これに 0.5rem の余裕を足したものを確保する。
 *
 * px で持たない。ボタンの大きさと間隔は rem なので、ルートの文字サイズを上げる帯
 * (globals.css の幅 640〜767px)では 1.125 倍に伸びるが、--mobile-nav-height は
 * その帯で px 据え置きになる。両者が混ざるため、式を CSS に書いてプローブで実測する。
 *
 * 画面下に帯が出ているあいだは、ボタンがそのぶん上へ逃げる
 * (bottom に --recording-bar-height を足してある)。確保する余白も同じだけ増やす。
 */
const CLEARANCE_STYLE = "calc(var(--mobile-nav-height) + 7.75rem + 0.5rem)";

/**
 * クリアランス要素より下に既にある「固定の余白」を測る。
 * 祖先の padding-bottom / border-bottom と、流れの中で後ろに続く要素の高さを足す。
 * (例: <main> が下部ナビぶんに確保している padding-bottom)
 *
 * 祖先の高さそのものは数えない。<main> の min-h-svh のように
 * 「1画面に満たないときだけ引き伸ばされる」高さは、余白を足せばその分だけ縮むので、
 * コンテンツを押し上げる力にはならない。数えてしまうと余白が足りなくなる。
 *
 * margin は数えていない。少なめに見積もる分には余白が増える側に倒れるだけなので、
 * 隠れないという目的は損なわない。
 */
function measureFixedSpaceBelow(el: HTMLElement): number {
  let total = 0;
  let node: HTMLElement = el;

  while (node !== document.body && node.parentElement) {
    for (
      let sibling = node.nextElementSibling;
      sibling;
      sibling = sibling.nextElementSibling
    ) {
      const style = getComputedStyle(sibling);
      // フローティングなど流れから外れた要素は、下のコンテンツを押し上げない。
      if (style.position === "fixed" || style.position === "absolute") continue;
      total += sibling.getBoundingClientRect().height;
    }

    const parent = node.parentElement;
    const parentStyle = getComputedStyle(parent);
    total +=
      parseFloat(parentStyle.paddingBottom) + parseFloat(parentStyle.borderBottomWidth);
    node = parent;
  }

  return total;
}

/**
 * モバイルのフローティングボタン(一覧の＋ / トップへ戻る、記録詳細のシェア・3点メニュー)に
 * 最後のカードが隠れないための下部クリアランス。
 *
 * 固定の余白(pb-35 など)にすると、件数が少なくコンテンツが画面下端から
 * 十分離れているときでも余白ぶんだけ画面を超え、「空白へスクロールできてしまう」。
 * そこで、コンテンツ末尾がフローティング領域(画面下端から CLEARANCE_PX)に
 * 掛かるときだけ余白を出す。
 *   - 画面下端まで CLEARANCE_PX 以上空いているとき: 高さ0。スクロールしなくても
 *     ボタンに掛からないので余白は要らない。
 *   - 掛かっているとき: 「文書の末尾がコンテンツ末尾より CLEARANCE_PX 下にある」
 *     状態にする。こうすると一番下までスクロールしたときに、コンテンツ末尾が
 *     ちょうどフローティング領域の上端まで上がる。
 *
 * 「不足分だけ(CLEARANCE_PX - 空き)」では足りない。余白を足しても文書が画面を
 * 超えなければスクロールできず、コンテンツ末尾は一切上がらないため、
 * デッキが5件などちょうど下端付近で終わる件数でボタンがカードに被ってしまう。
 * ページ側に既にある固定の余白(下部ナビぶんの padding など)は、押し上げる力として
 * そのまま使えるので、その分は差し引いて二重に余白を出さない。
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
  // 確保したい余白(CLEARANCE_STYLE)の実ピクセル値を測るためのプローブ
  const clearanceProbeRef = useRef<HTMLDivElement>(null);
  const [clearance, setClearance] = useState(0);

  useEffect(() => {
    const el = ref.current;
    const probe = probeRef.current;
    const clearanceProbe = clearanceProbeRef.current;
    if (!el || !probe || !clearanceProbe) return;

    const measure = () => {
      // コンテンツ末尾の絶対Y位置。自身より下のクリアランス高には依存しないため、
      // 余白のON/OFFで測定値が揺れず発振しない。
      const contentBottom = el.getBoundingClientRect().top + window.scrollY;
      const svh = probe.offsetHeight;
      // 画面下端からコンテンツ末尾までの空き。ビューポートを超えていれば負になる。
      const gap = svh - contentBottom;
      // 帯の高さ。出ていなければ 0
      const needed =
        clearanceProbe.getBoundingClientRect().height + readBottomBannerHeight();

      setClearance(
        gap >= needed ? 0 : Math.max(0, needed - measureFixedSpaceBelow(el)),
      );
    };

    measure();
    // 一覧の増減・追加読み込み・カード高の変化(きずな等)に追従する。
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    // 端末回転など svh 自体が変わる場合に追従する
    window.addEventListener("resize", measure);
    /*
     * 画面下の帯(アンケート・ホーム画面に追加・通知の許諾・記録中)の出入りも拾う。
     * 帯は position:fixed で body の大きさを変えないため ResizeObserver では気づけず、
     * 器(BottomBanner)が専用のイベントを投げている(utils/bottomBannerHeight)。
     */
    window.addEventListener(BOTTOM_BANNER_RESIZE_EVENT, measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener(BOTTOM_BANNER_RESIZE_EVENT, measure);
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
      {/* 確保したい余白の実寸を測るプローブ。式に rem と px が混ざるので CSS に計算させる */}
      <div
        ref={clearanceProbeRef}
        aria-hidden
        className="pointer-events-none invisible fixed top-0 left-0 w-0"
        style={{ height: CLEARANCE_STYLE }}
      />
      <div ref={ref} aria-hidden className="lg:hidden" style={{ height: clearance }} />
    </>
  );
}
