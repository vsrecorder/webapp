import { LuHouse, LuFileText, LuFilePen, LuLayers, LuTrophy } from "react-icons/lu";

export const navItems = [
  { href: "/", label: "ホーム", icon: LuHouse },
  { href: "/decks", label: "デッキ", icon: LuLayers },
  { href: "/records/create", label: "記録作成", icon: LuFilePen },
  { href: "/records", label: "記録一覧", icon: LuFileText },
  { href: "/cityleague_results", label: "大会結果", icon: LuTrophy },
] as const;

export function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/records")
    return pathname.startsWith("/records") && !pathname.startsWith("/records/create");
  return pathname.startsWith(href);
}
