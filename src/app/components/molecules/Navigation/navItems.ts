import type { IconType } from "react-icons";

import {
  LuHouse,
  LuFileText,
  LuFilePen,
  LuLayers,
  LuTrophy,
} from "react-icons/lu";

type NavItem = {
  href: string;
  label: string;
  icon: IconType;
  /*
   * <Link> にフルプリフェッチを明示するかどうか。
   *
   * ルートレイアウト(TemplateLayout)が auth() を呼ぶ都合で全ルートが動的レンダリングになる。
   * 動的ルートは loading.tsx を持たないと <Link> の既定のプリフェッチから外れるため、
   * タップして初めて RSC とルート用JSチャンクを取りに行くことになり、その往復のあいだ
   * 画面が前のページのまま止まる。
   *
   * 各ページは loading.tsx でこれを解消しているが、ホームだけは置けない。
   * 非会員のランディングと会員のダッシュボードを1ページで出し分けており、loading.tsx にすると
   * セッションが分かる前に表示が始まって、未ログインの直アクセスでもダッシュボードの骨格が
   * 映り込むため(理由は app/page.tsx のコメントを参照)。
   *
   * そこでホームだけはプリフェッチを明示する。ルート全体が先読みされ、さらにクライアント
   * キャッシュに staleTimes.static(既定5分)ぶん載るので、タップ時の往復自体が無くなる。
   * 実測(本番ビルド / CPU 4x / RTT 100ms): タップ→画面切り替えが 383ms → 200ms。
   * 代償は先読みの転送量で、1ページ表示あたり約22KB増える(データが少ないアカウントでの実測値)。
   *
   * 他の項目に付けて回らないこと。loading.tsx がある項目は骨格までの数KBを先読みするだけで
   * 既に120〜150msで切り替わっており、フルプリフェッチにすると転送量だけが増える。
   */
  prefetch?: true;
};

export const navItems: readonly NavItem[] = [
  { href: "/", label: "ホーム", icon: LuHouse, prefetch: true },
  { href: "/decks", label: "デッキ一覧", icon: LuLayers },
  { href: "/records/create", label: "記録作成", icon: LuFilePen },
  { href: "/records", label: "記録一覧", icon: LuFileText },
  { href: "/cityleague_results", label: "大会結果", icon: LuTrophy },
];

export function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/records")
    return pathname.startsWith("/records") && !pathname.startsWith("/records/create");
  return pathname.startsWith(href);
}
