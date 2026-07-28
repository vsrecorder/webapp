"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
 * 画面全体を覆うローディング（ScreenLockLoading）の表示・解除を扱う共通フック。
 *
 * 戻り遷移でのモーダル再開のように「裏で追加読み込み→自動スクロール→モーダルが開く」と
 * 続く処理を、終わるまで覆って操作も止めたい場面で使う。
 * 覆う対象（デッキ一覧・記録一覧）ごとに同じ制御を書き写さないよう、ここに集約する。
 *
 *   const { isLocked, lock, release } = useScreenLockLoading();
 *   ...
 *   {isLocked && <ScreenLockLoading label="デッキ情報を開いています" />}
 */

// 解除の契機が来なかった場合に、それでも必ず覆いを外すまでの時間。
// 通信が返ってこない等の想定外で、画面が触れないまま固まるのを防ぐ保険。
const FAILSAFE_MS = 10000;

export function useScreenLockLoading() {
  const [isLocked, setIsLocked] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const lock = useCallback(() => {
    clearHideTimer();
    setIsLocked(true);
  }, [clearHideTimer]);

  /*
   * 覆いを外す。
   *
   * delay には「覆いの下で始まった動き（モーダルの開閉アニメーション等）が
   * 終わるまでの時間」を渡す。0 を渡すと即座に外す。
   * 既に解除待ちのときは何もしない（最初の解除予定を優先する）。
   */
  const release = useCallback((delay = 0) => {
    if (hideTimerRef.current) return;

    if (delay <= 0) {
      setIsLocked(false);
      return;
    }

    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      setIsLocked(false);
    }, delay);
  }, []);

  useEffect(() => {
    if (!isLocked) return;
    const timer = setTimeout(() => setIsLocked(false), FAILSAFE_MS);
    return () => clearTimeout(timer);
  }, [isLocked]);

  useEffect(() => {
    return () => clearHideTimer();
  }, [clearHideTimer]);

  return { isLocked, lock, release };
}
