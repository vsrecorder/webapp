"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";

/*
 * 「サーバが用意してくれた値があればそれを使い、無ければ自分で取りに行く」部品ひとつぶんの状態。
 *
 * サーバ描画(RSC)や一覧 API がすでに持っている値を initial として渡せば、その部品は
 * ハイドレーション後に取りに行かず、最初の描画から中身を出せる。渡されなかったとき
 * (サーバ側で取れなかった・古い形の応答)だけ、従来どおりクライアントが取る。
 * key(取得の鍵になる id など)が無ければ何もしない。
 *
 * 使っているところ: 記録カードの周辺情報(イベント・デッキ・対戦の集計)、
 * ダッシュボードの各パネル(バッジ・ストリーク・称号・戦績)。
 *
 * initial は一覧の取り直し(記録一覧はマウント直後に1ページ目を裏で取り直す)で新しい
 * オブジェクトになるので、内容が変わったときは取り直した値に差し替える。内容が同じなら
 * 何もしない(呼び出し側がレンダーごとに新しいオブジェクトを渡しても更新が繰り返されないように)。
 *
 * fetcher は最新のものを ref に持ち、依存に含めない(呼び出し側がインラインの関数を渡しても
 * 取得が繰り返されないように)。
 *
 * 取得した値を呼び出し側が書き換えたいとき(モーダルで編集した結果を反映する等)は setData を使う。
 * 鍵は同じまま取り直させたいとき(参照先の内容だけが変わった等)は options.refreshKey を変える。
 */

// JSON として同じ内容か(周辺情報は API の JSON なので、これで十分に比べられる)
function sameContent(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

type State<T> = {
  data: T | null;
  loading: boolean;
  error: boolean;
};

export type SeededResource<T> = State<T> & {
  // 失敗したときの再取得(FetchError の onRetry に渡す)
  retry: () => void;
  // 取得した値を差し替える(取得中・失敗の状態はそのまま)
  setData: Dispatch<SetStateAction<T | null>>;
};

type Options = {
  // 変わると同じ鍵でも取り直す(参照先 id は同じまま中身だけ変わったときの取り直し用)
  refreshKey?: number | string;
};

export function useSeededResource<K extends string | number, T>(
  key: K | null | undefined,
  fetcher: (key: K) => Promise<T>,
  initial?: T,
  { refreshKey }: Options = {},
): SeededResource<T> {
  const hasKey = key !== null && key !== undefined && key !== "" && key !== 0;
  const [state, setState] = useState<State<T>>(() => ({
    data: initial ?? null,
    loading: hasKey && initial === undefined,
    error: false,
  }));
  // 何度目の取得か。retry で進めて effect を再実行させる
  const [attempt, setAttempt] = useState(0);

  // 最新の fetcher。描画中に ref を書かず、effect で追随させる(取得の effect より前に並べる)
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  // 初期値が対応する鍵(マウント時の key)。鍵が変わったら(モーダルで使用デッキを変えた等)、
  // 初期値は古いので取り直す
  const initialKeyRef = useRef(key);

  /*
   * いま出しているのが初期値そのものかどうか。一度でも取りに行ったら false になる。
   *
   * 「初期値があるなら取りに行かない」の判定を鍵の一致だけで行ってはならない。
   * 鍵を変えて取り直したあとにマウント時の鍵へ戻ってくると、表示中の値は別の鍵のもの
   * なのに「初期値があるから」と取りに行かず、古い値を出したままになる
   * (戦績の「不戦勝・不戦敗を除く」を切り替えても数字が変わらない、で見つかった)。
   */
  const showingInitialRef = useRef(initial !== undefined);

  // 初期値が(取り直しで)変わったら、それに差し替える。同じ内容なら何もしない
  const initialRef = useRef(initial);
  useEffect(() => {
    if (initial === undefined || initialRef.current === initial) return;
    const changed = !sameContent(initialRef.current, initial);
    initialRef.current = initial;
    if (changed) {
      setState({ data: initial, loading: false, error: false });
      showingInitialRef.current = true;
    }
  }, [initial]);

  // マウント時の refreshKey。そこから変わっていれば、初期値があっても取り直す
  const [initialRefreshKey] = useState(refreshKey);
  const refreshed = refreshKey !== initialRefreshKey;

  useEffect(() => {
    if (!hasKey) return;
    // 初期値をそのまま出しているなら取得は省く(retry・refreshKey・鍵の変更では取る)
    if (
      attempt === 0 &&
      !refreshed &&
      key === initialKeyRef.current &&
      initialRef.current !== undefined &&
      showingInitialRef.current
    ) {
      return;
    }

    let cancelled = false;
    showingInitialRef.current = false;
    setState((prev) => ({ ...prev, loading: true, error: false }));

    fetcherRef
      .current(key as K)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: false });
      })
      .catch((err) => {
        console.log(err);
        if (!cancelled) setState((prev) => ({ ...prev, loading: false, error: true }));
      });

    return () => {
      cancelled = true;
    };
  }, [hasKey, key, attempt, refreshKey, refreshed]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const setData = useCallback<Dispatch<SetStateAction<T | null>>>((update) => {
    setState((prev) => ({
      ...prev,
      data:
        typeof update === "function"
          ? (update as (prevData: T | null) => T | null)(prev.data)
          : update,
    }));
  }, []);

  // 鍵が無い(紐付くものが無い)ときは取得中にしない(鍵が途中で消えた場合も含む)
  return { ...state, loading: hasKey && state.loading, retry, setData };
}
