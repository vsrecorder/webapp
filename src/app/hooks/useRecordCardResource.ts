"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
 * 記録カードが出す周辺情報(イベント・デッキ・対戦の集計)を1つ持つ。
 *
 * 一覧 API(BFF /api/records)が details として付けてくれた値(initial)があれば、それを
 * そのまま使って取得しない。無い(サーバで取れなかった・古い形の応答)ときだけ、
 * 従来どおりカードが自分で取る。key(取得の鍵になる id)が無ければ何もしない。
 *
 * initial は一覧の取り直し(記録一覧はマウント直後に1ページ目を裏で取り直す)で新しい
 * オブジェクトになるので、内容が変わったときは取り直した値に差し替える。内容が同じなら
 * 何もしない(呼び出し側がレンダーごとに新しいオブジェクトを渡しても更新が繰り返されないように)。
 *
 * fetcher は最新のものを ref に持ち、依存に含めない(呼び出し側がインラインの関数を渡しても
 * 取得が繰り返されないように)。
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

export type RecordCardResource<T> = State<T> & {
  // 失敗したときの再取得(FetchError の onRetry に渡す)
  retry: () => void;
};

export function useRecordCardResource<K extends string | number, T>(
  key: K | null | undefined,
  fetcher: (key: K) => Promise<T>,
  initial?: T,
): RecordCardResource<T> {
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

  // 初期値が(取り直しで)変わったら、それに差し替える。同じ内容なら何もしない
  const initialRef = useRef(initial);
  useEffect(() => {
    if (initial === undefined || initialRef.current === initial) return;
    const changed = !sameContent(initialRef.current, initial);
    initialRef.current = initial;
    if (changed) setState({ data: initial, loading: false, error: false });
  }, [initial]);

  useEffect(() => {
    if (!hasKey) return;
    // 初期値があるなら最初の取得は省く(retry と鍵の変更では取る)
    if (attempt === 0 && key === initialKeyRef.current && initialRef.current !== undefined) return;

    let cancelled = false;
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
  }, [hasKey, key, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // 鍵が無い(紐付くものが無い)ときは取得中にしない(鍵が途中で消えた場合も含む)
  return { ...state, loading: hasKey && state.loading, retry };
}
