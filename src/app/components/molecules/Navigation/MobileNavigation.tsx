"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems, isActiveRoute } from "./navItems";
import { useNavPendingHref } from "./useNavPendingHref";

// 下部ナビを出さないページ。
// /kizuna は新機能のプロモーションページで、1枚の縦長LPとして最後まで読ませたいため、
// アプリ内のナビゲーションを被せない。
const HIDDEN_PATHNAMES = ["/kizuna"];

export default function MobileNavigation() {
  const pathname = usePathname();
  // タップした項目を遷移先が描かれるまで選択中の見た目にする(useNavPendingHref 参照)
  const { pending, markPending } = useNavPendingHref(pathname);

  if (HIDDEN_PATHNAMES.includes(pathname)) return null;

  return (
    /*
      バーは画面下端に貼り付けず、左右と下に余白を取って浮かせる。
      セーフエリア(iOS のホームインジケータ)の内側にさらに --mobile-nav-gap を空けるので、
      下端に接して窮屈に見えることがない。塞ぐ高さの合計は --mobile-nav-height として
      globals.css が出しており、本文の下余白や浮かせる要素はこれまでどおりそれを見る。

      浮かせる余白は、この <nav> を画面下端いっぱいに敷いたうえで padding として取る。
      <nav> を余白ぶん縮めてバーだけを置くと、空いた隙間から背後のカードやボタンに
      タップが抜けてしまい、ナビの脇を触っただけで別の画面へ飛ぶ。
      面も枠も持たない透明な帯なので見た目は変わらず、タップだけをここで止める。
      スワイプは fixed 要素の上でもページへ伝わるので、スクロールは妨げない。
    */
    <nav
      className="fixed z-50 bottom-0 left-0 right-0 px-4 lg:hidden"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom) + var(--mobile-nav-gap))",
      }}
    >
      {/*
        浮かせた面は透かさない。背後をページが流れていくので、半透明だと文字とアイコンが
        読みにくくなる(貼り付いていた頃は下端の帯で背景が単調だったため透かせていた)。
        角を丸めた面に落ちる影で浮きを出し、枠線は置かない。ダークだけは影が沈んで
        輪郭が消えるので、細い枠で縁を作り、面もカード(neutral-900 相当)より一段明るくして
        手前にあることを示す(暗い面のままだとカードより奥に沈んで見えていた)。
      */}
      <div
        className="mobile-nav-bar grid h-[var(--mobile-nav-bar-height)] overflow-hidden rounded-[1.75rem] bg-white dark:border dark:border-neutral-700/80 dark:bg-neutral-800"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
      >
        {navItems.map(({ href, label, icon: Icon, prefetch }) => {
          const current = isActiveRoute(pathname, href);
          const active = current || pending === href;
          return (
            <Link
              key={href}
              href={href}
              // ホームのみ true。理由は navItems.ts の NavItem.prefetch を参照
              prefetch={prefetch}
              aria-label={label}
              aria-current={current ? "page" : undefined}
              onClick={() => markPending(href)}
              /*
                選択中は色だけで示す。面を敷くと、丸めた角に四角い塗りがぶつかって
                両端の項目だけ角が欠けて見える。
                ダークは面を neutral-800 に明るくしたぶん、既定の色では文字との差が縮む
                (実測のコントラスト比: 未選択 default-400 は 4.42、選択中 primary は 3.25)。
                一段明るい色に上げて、面を明るくする前(5.24 / 3.85)を下回らないようにする。
                ダークの default は番号が大きいほど明るいので、ホバーも 600 へ上げる。
                選択中はアイコンと文字をブランドのグラデーションで塗る(brand-gradient-content)。
                text-primary は、グラデーションを描けない環境向けの控えの色として残す。
              */
              className={`mobile-nav-item flex flex-col items-center justify-start gap-1 transition-all duration-150 active:scale-90 ${
                active
                  ? "brand-gradient-content text-primary dark:text-primary-600"
                  : "text-default-400 hover:text-default-600 dark:text-default-500 dark:hover:text-default-600"
              }`}
            >
              <div className="flex items-center justify-center w-10 h-6">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[0.625rem] leading-none font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
