"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems, isActiveRoute } from "./navItems";

export default function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed z-50 lg:hidden bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md dark:bg-neutral-900/80 border-t border-default-200/50 dark:border-neutral-800/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="grid h-16"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActiveRoute(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 transition-all duration-150 active:scale-90 ${
                active
                  ? "text-primary bg-primary/10"
                  : "text-default-400 hover:text-default-600 dark:hover:text-default-300"
              }`}
            >
              <div className="flex items-center justify-center w-10 h-6">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] leading-none font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
