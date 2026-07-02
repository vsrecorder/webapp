"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems, isActiveRoute } from "./navItems";

export default function DesktopNavigation() {
  const pathname = usePathname();

  return (
    <nav className="hidden lg:flex flex-col fixed z-40 top-14 left-0 bottom-0 w-20 py-4 gap-1 bg-white/80 backdrop-blur-md dark:bg-neutral-900/80 border-r border-default-200/50 dark:border-neutral-800/80">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActiveRoute(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-1 mx-2 py-3 rounded-xl transition-all duration-150 ${
              active
                ? "text-primary bg-primary/10"
                : "text-default-400 hover:text-default-600 dark:hover:text-default-300"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] leading-none font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
