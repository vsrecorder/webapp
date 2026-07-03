"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems, isActiveRoute } from "./navItems";

export default function DesktopNavigation() {
  const pathname = usePathname();

  return (
    <nav className="hidden lg:flex flex-col fixed z-40 top-14 left-0 bottom-0 w-56 py-4 px-3 gap-1 bg-white/80 backdrop-blur-md dark:bg-neutral-900/80 border-r border-default-200/50 dark:border-neutral-800/80">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActiveRoute(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
              active
                ? "text-primary bg-primary/10"
                : "text-default-500 hover:text-default-700 hover:bg-default-100 dark:hover:text-default-300 dark:hover:bg-neutral-800/60"
            }`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
