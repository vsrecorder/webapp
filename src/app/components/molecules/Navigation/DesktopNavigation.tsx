"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems, isActiveRoute } from "./navItems";
import { useNavPendingHref } from "./useNavPendingHref";

export default function DesktopNavigation({ brand }: { brand: React.ReactNode }) {
  const pathname = usePathname();
  // タップした項目を遷移先が描かれるまで選択中の見た目にする(useNavPendingHref 参照)
  const { pending, markPending } = useNavPendingHref(pathname);

  return (
    /*
      非対応バナー(h-8)の下から画面下端までを占める。ロゴはこの上端に置き、ヘッダーは右の本文の上だけに出る
      (organisms/Layout/Header.tsx)。
      面は不透明にする。以前は bg-white/80 の半透明だったが、真下は本文(app-dot-bg)ではなく
      body の地色(ステータスバー色の青/dev はオレンジ)なので、サイドバー全体がその色に染まっていた。
    */
    <nav className="hidden lg:flex flex-col fixed z-40 top-8 left-0 bottom-0 w-56 bg-white dark:bg-neutral-900 border-r border-default-200 dark:border-neutral-800">
      {/* ロゴの行はヘッダー本体(h-20)と同じ高さにして、下端の区切りをヘッダーの下端と一直線にする */}
      <div className="flex items-center h-20 shrink-0 px-5 border-b border-default-200 dark:border-neutral-800">
        {brand}
      </div>
      <div className="flex flex-col gap-1 px-3 py-4">
        {navItems.map(({ href, label, icon: Icon, prefetch }) => {
          const current = isActiveRoute(pathname, href);
          const active = current || pending === href;
          return (
            <Link
              key={href}
              href={href}
              // ホームのみ true。理由は navItems.ts の NavItem.prefetch を参照
              prefetch={prefetch}
              aria-current={current ? "page" : undefined}
              onClick={() => markPending(href)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? "brand-gradient-content text-primary bg-primary/10"
                  : "text-default-500 hover:text-default-700 hover:bg-default-100 dark:hover:text-default-300 dark:hover:bg-neutral-800/60"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
