"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems, isActiveRoute } from "./navItems";
import { useNavPendingHref } from "./useNavPendingHref";

// 下部ナビを出さないページ。
// /kizuna は新機能のプロモーションページで、1枚の縦長LPとして最後まで読ませたいため、
// アプリ内のナビゲーションを被せない。
const HIDDEN_PATHNAMES = ["/kizuna"];

type Props = {
  // 最下端のセーフエリアを埋める色。上部ステータスバーと揃えるため、
  // サーバ(Navigation)が getStatusBarColor() を解決して渡す
  safeAreaColor: string;
};

export default function MobileNavigation({ safeAreaColor }: Props) {
  const pathname = usePathname();
  // タップした項目を遷移先が描かれるまで選択中の見た目にする(useNavPendingHref 参照)
  const { pending, markPending } = useNavPendingHref(pathname);

  if (HIDDEN_PATHNAMES.includes(pathname)) return null;

  return (
    <nav className="fixed z-50 lg:hidden bottom-0 left-0 right-0">
      {/* ナビ本体。すりガラス調の白は従来どおり。背景を内側のこの層に移し、
          下のセーフエリア帯だけ別色にできるようにした */}
      <div
        className="grid h-[var(--mobile-nav-height)] bg-white/80 backdrop-blur-md dark:bg-neutral-900/80 border-t border-default-200/50 dark:border-neutral-800/80"
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
              className={`mobile-nav-item flex flex-col items-center justify-start gap-1 transition-all duration-150 active:scale-90 ${
                active
                  ? "text-primary bg-primary/10"
                  : "text-default-400 hover:text-default-600 dark:hover:text-default-300"
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
      {/* 最下端のセーフエリア(ホームインジケーター等の帯)を、上部ステータスバーと
          同じ色で埋める。safe-area-inset-bottom が 0 の端末では高さ 0 で見えない */}
      <div
        aria-hidden
        style={{ height: "env(safe-area-inset-bottom)", backgroundColor: safeAreaColor }}
      />
    </nav>
  );
}
