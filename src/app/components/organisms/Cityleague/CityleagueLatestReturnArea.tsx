"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";

import { useReturnTargetItem } from "@app/hooks/useReturnTargetItem";
import {
  CITYLEAGUE_LATEST_RETURN_KEY,
  CITYLEAGUE_SCROLL_TO_ID_KEY,
  CityleagueLatestReturnState,
  clearCityleagueLatestReturn,
  markCityleagueLatestReturn,
  parseCityleagueLatestReturn,
} from "@app/utils/cityleagueScrollRestore";
import { hasReturnedHereSince } from "@app/utils/returnNavigation";
import { readSessionStorage } from "@app/utils/sessionStorageStore";

type TopLink = Omit<CityleagueLatestReturnState, "savedAt">;

// 見えている中で一番上のリンク。リンク集が画面に入っていなければ null
function findTopVisibleLink(root: HTMLElement): TopLink | null {
  for (const link of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const rect = link.getBoundingClientRect();
    if (rect.width === 0 || rect.bottom <= 0) continue;
    // 上から順に並んでいるので、最初に見つかったものが画面より下ならリンク集は見えていない
    if (rect.top >= window.innerHeight) return null;

    return { href: link.getAttribute("href") ?? "", top: rect.top };
  }

  return null;
}

function findLink(root: HTMLElement, href: string): HTMLAnchorElement | null {
  return (
    Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href]")).find(
      (link) => link.getAttribute("href") === href,
    ) ?? null
  );
}

/*
 * 大会結果一覧の末尾のリンク集(CityleagueLatestSection)を包み、戻ってきたときに元の位置で見せる。
 *
 * 控え方は開催日ページ(CityleagueDateEventTabs)と同じ。リンクの押下ではなく、この部品が外れるときに
 * 控える(router.push で移るメニューや、戻る→進むで離れる経路も拾うため)。控える位置は外れるときに
 * 測らず、スクロールのたびに覚えた値を使う(戻る/進むでは、外れる時点で先頭リセットがもう済んでいる)。
 *
 * 一覧のカードから進んだときは、一覧が自分でそのカードへ戻す(CITYLEAGUE_SCROLL_TO_*)。
 * 両方で動かすと後から動いた方が勝つので、そのときは控えない。
 */
export default function CityleagueLatestReturnArea({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);

  /*
   * 受け取るのは、このリンク集が現れた時点で既に書かれていた控えだけ(useReturnTargetItem)。
   * 使うのは戻ってきたとき(ブラウザの戻る/進む・ページ内の戻るリンク)だけで、下部ナビなどで
   * 開き直したときは従来どおり先頭から見せる(utils/returnNavigation)。
   */
  const savedReturn = useReturnTargetItem(CITYLEAGUE_LATEST_RETURN_KEY);
  const returnState = useMemo(
    () => parseCityleagueLatestReturn(savedReturn),
    [savedReturn],
  );
  const pendingReturn =
    returnState !== null &&
    hasReturnedHereSince(returnState.savedAt, pathname ?? undefined)
      ? returnState
      : null;

  useEffect(() => {
    if (savedReturn === null) return;

    // 戻ってきたのでなければ使わずに消す(残すと、次に進んで戻ったときに古い位置へ送られる)
    if (pendingReturn === null) {
      clearCityleagueLatestReturn();
      return;
    }

    // ページ遷移の先頭リセット(useScrollResetOnNavigation)が済んでから合わせる
    const frame = requestAnimationFrame(() => {
      clearCityleagueLatestReturn();

      const root = rootRef.current;
      const link = root ? findLink(root, pendingReturn.href) : null;
      if (!link) return;

      const delta = link.getBoundingClientRect().top - pendingReturn.top;
      window.scrollTo({ top: Math.max(0, window.scrollY + delta), behavior: "auto" });
    });

    return () => cancelAnimationFrame(frame);
  }, [savedReturn, pendingReturn]);

  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  });
  const topLinkRef = useRef<TopLink | null>(null);
  const leavingRef = useRef(false);

  useEffect(() => {
    const remember = () => {
      const root = rootRef.current;
      if (root && !leavingRef.current) topLinkRef.current = findTopVisibleLink(root);
    };
    const handlePopState = () => {
      // モーダルを閉じるためのバックのように、このページにとどまる popstate は除く
      if (window.location.pathname !== pathnameRef.current) leavingRef.current = true;
    };

    remember();
    window.addEventListener("scroll", remember, { passive: true });
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("scroll", remember);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useLayoutEffect(() => {
    return () => {
      const topLink = topLinkRef.current;

      // リンク集が見えていなかった・一覧のカードから進んだ(一覧が自分で戻す)ときは控えない
      if (!topLink || readSessionStorage(CITYLEAGUE_SCROLL_TO_ID_KEY) !== null) {
        clearCityleagueLatestReturn();
        return;
      }

      markCityleagueLatestReturn(topLink);
    };
  }, []);

  return <div ref={rootRef}>{children}</div>;
}
