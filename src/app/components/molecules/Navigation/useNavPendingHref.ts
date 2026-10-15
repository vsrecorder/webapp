import { useEffect, useState } from "react";

import { isActiveRoute } from "./navItems";

/*
 * タップしたナビ項目を、遷移先が描かれるまで「選択中」の見た目にするための状態。
 *
 * 各ページは loading.tsx の骨格が先に出るが、その骨格が描かれるまでにも本番ビルド・CPU 4x の
 * 実測で 110〜390ms かかる(ホーム起点が最も遅い。ホームの大きな DOM を畳むコミットのぶん)。
 * Next の useLinkStatus は先読み済みの遷移では pending にならない仕様で、この間を埋められない。
 * 押した瞬間に項目の色だけ先に変えて、押せたことを返す。
 *
 * pathname が遷移先になれば isActiveRoute が真になるので、そのまま「選択中」に繋がる。
 * 遷移が起きなかったとき(押したのが今いるページ・失敗)のために、時間で解除する。
 *
 * pathname が変わったら(どこへ着いたにせよ)押した項目は捨てる。着いた後も残しておくと、
 * ナビ以外(ページ内のリンク・戻る)でそのページを離れたときに「まだ着いていない」と見なされ、
 * 開いていない項目が時間で解除されるまで選択中の色になっていた。
 */
const PENDING_RESET_MS = 5000;

export function useNavPendingHref(pathname: string) {
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // effect で捨てると古い pending のまま一度描かれるので、前回の pathname を控えて描画中に捨てる
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setPendingHref(null);
  }

  // 遷移先に着いたら(または元から居たら)もう pending ではない
  const pending = pendingHref != null && !isActiveRoute(pathname, pendingHref) ? pendingHref : null;

  useEffect(() => {
    if (pending == null) return;

    const timer = setTimeout(() => setPendingHref(null), PENDING_RESET_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  function markPending(href: string) {
    if (!isActiveRoute(pathname, href)) setPendingHref(href);
  }

  return { pending, markPending };
}
