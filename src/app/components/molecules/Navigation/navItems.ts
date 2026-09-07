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
   * キャッシュに staleTimes.static(180 秒)ぶん載るので、タップ時の往復自体が無くなる。
   * 実測(本番ビルド / CPU 4x / RTT 100ms): タップ→画面切り替えが 383ms → 200ms。
   * 代償は先読みの転送量で、1ページ表示あたり約46KB(gzip 後)増える。
   *
   * 他の項目には付けない。2026-09-08 に /decks・/records・/records/create へ付けて
   * 本番ビルド・CPU 4x・並の 4G で A/B を取ったところ、遷移先の本体が骨格を挟まず一度に描かれる
   * ぶん、他ページ起点では本体到達が 460〜790ms → 300〜400ms と速くなる一方、ホーム起点では
   * ホームの大きな DOM を畳んで本体を描くコミットが重く「画面が動く」までが 170〜390ms → 790〜1060ms
   * に悪化した(着地 10 秒後の落ち着いた状態でも同じ。着地直後は先読み自体とも取り合って 1.4 秒超)。
   * アプリの入口はホームなので、骨格を先に出す既定の先読みのままにする。
   * タップ直後の手応えは useNavPendingHref(押した項目を即座に選択中の見た目にする)で補う。
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
  // みんなの公開デッキ(/shared_decks)はデッキ一覧のセグメントから入るので、デッキ一覧を選択中にする
  if (href === "/decks") return pathname.startsWith("/decks") || pathname.startsWith("/shared_decks");
  return pathname.startsWith(href);
}
