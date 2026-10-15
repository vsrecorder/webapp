"use client";

import { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useReturnTargetItem } from "@app/hooks/useReturnTargetItem";
import { hasReturnedHereSince } from "@app/utils/returnNavigation";
import { scrollBackToAnchor } from "@app/utils/returnTarget";
import {
  PostListReturnState,
  clearPostListReturn,
  isLeavingLinkClick,
  markPostListReturn,
  parsePostListReturn,
  sharedDeckPostAnchorId,
} from "@app/utils/sharedDecksReturn";

/*
 * 公開デッキの一覧・投稿者ページが、別のページから戻ってきたときの控え(utils/sharedDecksReturn)を
 * 受け取る。戻すべきでなければ null。
 *
 * 受け取るのは、一覧が現れた時点で既に書かれていたものだけ(useReturnTargetItem。進む直前に
 * 書いた控えを、まだ画面に残っている元の一覧が受け取らない)。位置を合わせ終えると控えは消すが、
 * 一覧はそのまま使い続けたいので、最初に受け取った値を持ち続ける(レンダー中の前回値比較)。
 * ハイドレーションの最初の描画では null なので、ページごと読み込まれて戻ったときは、
 * その直後に控えを受け取る。呼び出し側は戻すかどうかで key を変えて一覧を作り直すこと。
 *
 * belongsHere はその控えがこの一覧のものか(投稿者ページなら同じ投稿者か)。
 */
export function useRestoredPostList<S extends PostListReturnState>(
  key: string,
  belongsHere: (state: S) => boolean,
): S | null {
  const saved = useReturnTargetItem(key);
  const [restoredRaw, setRestoredRaw] = useState<string | null>(null);
  if (saved !== null && saved !== restoredRaw) setRestoredRaw(saved);

  const state = useMemo(() => parsePostListReturn<S>(restoredRaw), [restoredRaw]);
  const mine = state !== null && belongsHere(state);
  // 戻ってきたとき(ブラウザの戻る/進む・ページ内の戻るリンク)だけ戻す。控えを置いたまま
  // 別の経路で開き直したときは先頭から(utils/returnNavigation)
  const accepted = mine && hasReturnedHereSince(state.savedAt);

  /*
   * この一覧の控えなのに使わなかったら消す。残すと、この一覧から別のページへ進んで
   * 戻ったときに(このときは履歴移動があるので)古い一覧が出てしまう。
   * 別の一覧の控え(投稿者ページAからいいねした人を辿って開いた投稿者ページBにとっての、
   * Aの控え)は消さない。消すとAへ戻ったときに元に戻せない。
   */
  // 読めない控え(形が変わった古い版のものなど)も、残しておく意味が無いので消す
  const discarded = (mine && !accepted) || (restoredRaw !== null && state === null);
  useEffect(() => {
    if (discarded) clearPostListReturn(key);
  }, [discarded, key]);

  return accepted ? state : null;
}

/*
 * 戻ってきたら、押したカードを離れる前と同じ画面上の高さへ置き、控えを消す。一覧は控えから
 * 描いてあるのでカードは最初の描画からある。ページ遷移の先頭リセット(useScrollResetOnNavigation)は
 * 親の effect でこれより後に走るので、フレームを1つ待ってから動かす。
 */
export function useScrollBackOnRestore(
  key: string,
  restored: PostListReturnState | null,
  fallbackTop: number,
): void {
  useEffect(() => {
    if (!restored) return;

    clearPostListReturn(key);

    const frame = requestAnimationFrame(() => {
      scrollBackToAnchor(sharedDeckPostAnchorId(key, restored.anchorPostId), fallbackTop);
    });

    return () => cancelAnimationFrame(frame);
  }, [key, restored, fallbackTop]);
}

/*
 * 戻ってきて控えから描いた一覧を、1回だけ裏で取り直して中身を最新に寄せる
 * (並び・件数は変えないので位置は動かない。useOffsetPagination の refreshItems)。
 * 進んだ先で押したいいねが、押す前の表示のまま残らないようにするため。
 */
export function useRefreshOnRestore(
  restored: PostListReturnState | null,
  refresh: () => Promise<void>,
): void {
  // refresh は一覧が変わるたびに作り直されるので、1回だけにする(開発時の StrictMode でも)
  const refreshed = useRef(false);

  useEffect(() => {
    if (!restored || refreshed.current) return;
    refreshed.current = true;
    void refresh();
  }, [restored, refresh]);
}

/*
 * 一覧を離れるリンクが押されたら、戻ってきたときのために今の一覧を控える。
 * 返す関数をカードの外側の要素の onClickCapture に、押されたカードの投稿IDと一緒に渡す
 * (カードは memo しているので、押したときの処理はカードに渡さず外側で拾う。いいねした人の
 * モーダルはポータルで外に描かれるが、React のイベントは部品の親子関係で伝わるので拾える)。
 * 控える中身は押した時点のものが要るので、最新の値を ref に置いておく。
 */
export function usePostListLeaveRecorder<S extends PostListReturnState>(
  key: string,
  state: Omit<S, "anchorPostId" | "savedAt">,
): (postId: string, event: MouseEvent) => void {
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  return useCallback(
    (postId: string, event: MouseEvent) => {
      if (!isLeavingLinkClick(event)) return;
      markPostListReturn<S>(key, { ...stateRef.current, anchorPostId: postId } as Omit<
        S,
        "savedAt"
      >);
    },
    [key],
  );
}
