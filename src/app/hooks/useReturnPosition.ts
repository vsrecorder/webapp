"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";

import { useReturnTargetItem } from "@app/hooks/useReturnTargetItem";
import { hasReturnedHereSince } from "@app/utils/returnNavigation";
import { writeReturnTarget } from "@app/utils/returnTarget";
import { writeSessionStorage } from "@app/utils/sessionStorageStore";

/*
 * ページを離れたときの位置を控え、戻ってきたら同じ位置で見せる(大会結果の索引・会場一覧などのハブページ)。
 *
 * 控えるのは、離れる時点で画面の上端にあった目印(リンク・見出し)と、その画面上の高さ。戻ったら
 * その目印を同じ高さに置く。スクロール量ではなく目印で合わせるのは、戻るまでに上側の中身が
 * 変わっていても(新しい大会の追加、上の一覧が1ページ目に戻るなど)同じ所を出すため。
 *
 * 控え方はシティリーグの開催日ページ(CityleagueDateEventTabs)と同じ:
 *   - リンクの押下ではなく、ページが外れるときに控える。ユーザーメニューなどは router.push で移り、
 *     戻る→進むでもリンクは押されないので、押下を拾うだけでは控えられない経路がある。
 *   - 位置は外れるときに測らず、スクロールのたびに覚えた値を使う。ブラウザの戻る/進むで離れるときは、
 *     先頭リセット(useScrollResetOnNavigation)が popstate の中でページが外れるより先に走り、
 *     外れる時点ではもう先頭にいる。別のページへの popstate を受けたら以後は覚え直さない。
 *   - 使うのは戻ってきたとき(ブラウザの戻る/進む・ページ内の戻るリンク)だけ(utils/returnNavigation)。
 *     控えを置いたまま下部ナビなどで開き直したときは、ふつうに先頭から見せる。
 */

// 目印にする要素。リンクの無い所でも何かが当たるよう見出しも含める
const ANCHOR_SELECTOR = "a[href], h1, h2, h3";

/*
 * 画面にリンクも見出しも無いとき(大型大会の区分ページで入賞者カードが並ぶ所など)の目印。
 * 包んだ範囲そのものの位置で合わせる(範囲の中の同じ所へ戻る)
 */
const ROOT_KEY = "root";

// 戻ったときに目印が現れるのを待つ長さ。後から流し込まれる部分(Suspense)に目印があることがある
const RESTORE_WAIT_MS = 2000;

/*
 * 戻った位置までページの長さが足りないとき、この差までなら待たずに合わせる(一番下へ)。
 * スマホのアドレスバーの出入りで画面の高さが変わるぶん(およそ 50〜100px)。待つのは、
 * 後から流し込まれる部分が届いていなくて大きく足りないときだけにする(一番下で離れたとき、
 * アドレスバーのぶん届かないだけで先頭が2秒見えてから飛ぶのを避ける)
 */
const REACH_TOLERANCE_PX = 120;

type Anchor = {
  // 目印の見分け。リンクは href、見出しはタグと文言
  key: string;
  // 同じ見分けの目印のうち何番目か(同じ href のリンクが複数あることがある)
  nth: number;
  // 画面上の高さ(getBoundingClientRect().top)
  top: number;
};

type ReturnPositionState = Anchor & {
  // 控えた時刻。これより後に戻ってきたときだけ使う
  savedAt: number;
};

function anchorKey(el: Element): string {
  const href = el.getAttribute("href");
  if (href !== null) return `href:${href}`;
  return `${el.tagName}:${(el.textContent ?? "").trim().slice(0, 80)}`;
}

// 画面に貼り付いている要素(sticky の戻るリンクなど)の中か。スクロールしても動かないので目印にならない
function isPinned(el: Element, root: Element): boolean {
  for (let node: Element | null = el; node && node !== root; node = node.parentElement) {
    const { position } = getComputedStyle(node);
    if (position === "sticky" || position === "fixed") return true;
  }
  return false;
}

// スクロールのたびに覚える、画面上端の目印(見分けは離れるときに求める。describeAnchor)
type SeenAnchor = { root: Element; el: Element; top: number };

/*
 * 見えている中で一番上の目印。範囲が画面に入っていなければ null。
 * 画面にリンクも見出しも無ければ、包んだ範囲そのもの(el が root)。
 *
 * スクロールのたびに呼ぶので、前回見つけた位置(hint)から前後へ少しずつ動いて探す。
 * 以前は上から全件を測っていて、700件ほどリンクが並ぶページの下の方では1回に 7〜9ms
 * (CPU 4〜6倍遅延の実測。最大 16ms)かかり、1フレームの持ち時間の半分ほどを使っていた。
 */
export function findTopVisibleAnchor(
  root: Element,
  hint: { index: number } = { index: 0 },
): SeenAnchor | null {
  const rootRect = root.getBoundingClientRect();
  if (rootRect.bottom <= 0 || rootRect.top >= window.innerHeight) return null;

  const els = root.querySelectorAll(ANCHOR_SELECTOR);
  let i = Math.min(hint.index, els.length);

  // 画面より上へ抜けた目印の直後まで戻る(上へスクロールしたとき)
  const isAbove = (el: Element) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.bottom <= 0;
  };
  while (i > 0 && !isAbove(els[i - 1])) i -= 1;

  for (; i < els.length; i += 1) {
    const el = els[i];
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.bottom <= 0) continue;
    // 上から順に並んでいるので、画面より下まで来たら画面の中には無い
    if (rect.top >= window.innerHeight) break;
    if (isPinned(el, root)) continue;

    hint.index = i;
    return { root, el, top: rect.top };
  }

  hint.index = i;
  return { root, el: root, top: rootRect.top };
}

// 覚えた目印の見分け(何番目かを数えるのに全件を読むので、離れるときに1回だけ求める)。
// 目印が描き直しで差し替わっていたら null(同じ見分けの別の要素を指さないように)
function describeAnchor({ root, el, top }: SeenAnchor): Anchor | null {
  if (el === root) return { key: ROOT_KEY, nth: 0, top };
  if (!root.contains(el)) return null;

  const key = anchorKey(el);
  let nth = 0;
  for (const other of root.querySelectorAll(ANCHOR_SELECTOR)) {
    if (other === el) break;
    if (anchorKey(other) === key) nth += 1;
  }

  return { key, nth, top };
}

function findAnchor(root: Element, key: string, nth: number): Element | null {
  if (key === ROOT_KEY) return root;

  let count = 0;
  for (const el of root.querySelectorAll(ANCHOR_SELECTOR)) {
    if (anchorKey(el) !== key) continue;
    if (count === nth) return el;
    count += 1;
  }
  return null;
}

export function parseReturnPosition(raw: string | null): ReturnPositionState | null {
  if (raw === null) return null;

  try {
    const state = JSON.parse(raw) as Partial<ReturnPositionState>;
    if (
      typeof state.key !== "string" ||
      typeof state.nth !== "number" ||
      typeof state.top !== "number" ||
      !Number.isFinite(state.top) ||
      typeof state.savedAt !== "number"
    ) {
      return null;
    }

    return state as ReturnPositionState;
  } catch {
    return null;
  }
}

// 既定の控えの置き場所。ページごとに分ける(索引 → 会場一覧 → 会場と進んで2回戻ったとき、どちらも戻す)
const KEY_PREFIX = "returnPosition:";

export function returnPositionKey(pathname: string): string {
  return `${KEY_PREFIX}${pathname}`;
}

/*
 * ページごとの控えのうち、新しいものからこの数だけ残す。
 * 控えは戻ってこないページのぶんが消えずに残る(個別ページを何百と見て回ると、その数だけ増える)
 */
const MAX_KEPT_POSITIONS = 30;

function pruneReturnPositions(): void {
  try {
    const entries: { key: string; savedAt: number }[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key?.startsWith(KEY_PREFIX)) continue;
      entries.push({
        key,
        savedAt: parseReturnPosition(sessionStorage.getItem(key))?.savedAt ?? 0,
      });
    }
    if (entries.length <= MAX_KEPT_POSITIONS) return;

    entries.sort((a, b) => b.savedAt - a.savedAt);
    for (const { key } of entries.slice(MAX_KEPT_POSITIONS)) {
      writeSessionStorage(key, null);
    }
  } catch {
    // 読めない環境では控え自体が残らない
  }
}

type Options = {
  // 控えの置き場所。既定はページごと(returnPositionKey)
  storageKey?: string;
  /*
   * 離れるときに呼ぶ。true なら控えない(同じページのほかの仕組みが、この離れ方の位置を控えたとき)。
   * 戻ったときではなく離れるときに決めるのは、戻ったときの判定は effect の順番に左右されるため
   * (先に動いた側が自分の控えを消すと、後の側からは「ほかに無い」に見える)
   */
  skipRecord?: () => boolean;
};

export function useReturnPosition(
  rootRef: React.RefObject<HTMLElement | null>,
  { storageKey: givenKey, skipRecord }: Options = {},
): void {
  const pathname = usePathname();
  const storageKey = givenKey ?? returnPositionKey(pathname ?? "");

  /*
   * 受け取るのは、このページが現れた時点で既に書かれていた控えだけ(useReturnTargetItem)。
   * 描画中の戻り判定には usePathname を渡す(リンクで来た直後は location がまだ前のページ)
   */
  const savedReturn = useReturnTargetItem(storageKey);
  const returnState = useMemo(() => parseReturnPosition(savedReturn), [savedReturn]);
  const pendingReturn =
    returnState !== null &&
    hasReturnedHereSince(returnState.savedAt, pathname ?? undefined)
      ? returnState
      : null;

  const skipRecordRef = useRef(skipRecord);
  useEffect(() => {
    skipRecordRef.current = skipRecord;
  });
  // 戻った位置へ合わせ終わるのを待っている間か(目印が届くのを待つ間)
  const restoringRef = useRef(false);

  useEffect(() => {
    if (savedReturn === null) return;

    // 戻ってきたのでなければ使わずに消す(残すと、次に進んで戻ったときに古い位置へ送られる)
    if (pendingReturn === null) {
      writeSessionStorage(storageKey, null);
      return;
    }

    /*
     * ページ遷移の先頭リセット(useScrollResetOnNavigation)が済んでから合わせる。
     * 目印がまだ無ければ(後から流し込まれる部分にある)現れるまでフレームごとに探す。
     * 待つ間に利用者が動かしたら諦める(動かした先を奪わない)
     */
    const deadline = performance.now() + RESTORE_WAIT_MS;
    let frame = 0;
    restoringRef.current = true;

    const finish = () => {
      restoringRef.current = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("wheel", finish);
      window.removeEventListener("touchstart", finish);
      window.removeEventListener("keydown", finish);
      writeSessionStorage(storageKey, null);
    };

    const tryRestore = () => {
      const root = rootRef.current;
      const anchor = root ? findAnchor(root, pendingReturn.key, pendingReturn.nth) : null;

      const timedOut = performance.now() >= deadline;

      if (anchor) {
        const target = Math.max(
          0,
          window.scrollY + anchor.getBoundingClientRect().top - pendingReturn.top,
        );
        // ページがまだ届いていなくて(後から流し込まれる部分)そこまで送れないなら、伸びるのを待つ
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        if (target <= maxScroll + REACH_TOLERANCE_PX || timedOut) {
          window.scrollTo({ top: target, behavior: "auto" });
          finish();
          return;
        }
      }

      if (timedOut) finish();
      else frame = requestAnimationFrame(tryRestore);
    };

    window.addEventListener("wheel", finish, { passive: true });
    window.addEventListener("touchstart", finish, { passive: true });
    window.addEventListener("keydown", finish);
    frame = requestAnimationFrame(tryRestore);

    return () => {
      // 外れるときの控え(下の useLayoutEffect)はこれより先に走るので、そこでは待っている間のまま見える
      restoringRef.current = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("wheel", finish);
      window.removeEventListener("touchstart", finish);
      window.removeEventListener("keydown", finish);
    };
  }, [rootRef, storageKey, savedReturn, pendingReturn]);

  // 離れるときに控える。値はスクロールのたびに覚えたもの(上の説明)
  const pathnameRef = useRef(pathname);
  const storageKeyRef = useRef(storageKey);
  useEffect(() => {
    pathnameRef.current = pathname;
    storageKeyRef.current = storageKey;
  });
  const topAnchorRef = useRef<SeenAnchor | null>(null);
  const leavingRef = useRef(false);

  useEffect(() => {
    const hint = { index: 0 };
    const remember = () => {
      const root = rootRef.current;
      if (root && !leavingRef.current)
        topAnchorRef.current = findTopVisibleAnchor(root, hint);
    };
    const handlePopState = () => {
      // モーダルを閉じるためのバックのように、このページにとどまる popstate は除く
      if (window.location.pathname !== pathnameRef.current) leavingRef.current = true;
    };

    /*
     * 中身の大きさが変わったときも覚え直す。画像の読み込みや後から流し込まれる部分で目印が動いても、
     * iOS はスクロールアンカリングが無くスクロールイベントも出ないので、覚えた高さが古いまま残る
     */
    const root = rootRef.current;
    const resizeObserver =
      root && typeof ResizeObserver !== "undefined" ? new ResizeObserver(remember) : null;
    if (root) resizeObserver?.observe(root);

    remember();
    window.addEventListener("scroll", remember, { passive: true });
    window.addEventListener("popstate", handlePopState);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", remember);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [rootRef]);

  useLayoutEffect(() => {
    return () => {
      // 戻った位置へ合わせる前に離れたら、まだ使っていない控えをそのまま残す
      // (今覚えているのは、合わせる前のページの先頭の位置)
      if (restoringRef.current) return;

      const topAnchor = topAnchorRef.current;
      const anchor = topAnchor ? describeAnchor(topAnchor) : null;

      // 範囲が見えていなかったときは控えない(戻ったら従来どおり先頭から)
      if (!anchor || skipRecordRef.current?.()) {
        writeSessionStorage(storageKeyRef.current, null);
        return;
      }

      // 今いるページには受け取らせない(writeReturnTarget)
      writeReturnTarget(
        storageKeyRef.current,
        JSON.stringify({ ...anchor, savedAt: Date.now() }),
      );
      pruneReturnPositions();
    };
  }, []);
}
