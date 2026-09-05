"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type OffsetPage<T, M> = {
  items: T[];
  // ページと一緒に返る付随情報(一覧なら絞り込みに使った環境、投稿者ページなら集計など)
  meta: M;
};

type Options<T, M> = {
  // 取得条件を表すキー。変わると先頭から読み直す。null の間は取得せず空のまま
  key: string | null;
  pageSize: number;
  // offset から1ページ取る。常に最新の関数を使うので、条件を閉じ込めた関数を渡してよい
  fetchPage: (offset: number) => Promise<OffsetPage<T, M>>;
  getId: (item: T) => string;
  // サーバで取った1ページ目。最初の key に対してだけ使い、初回の取得を省く
  initial?: OffsetPage<T, M>;
};

type Loaded<T, M> = {
  key: string;
  items: T[];
  meta: M;
  hasMore: boolean;
};

function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error("Failed to fetch");
}

/*
 * offset / limit 方式のページ送り。みんなの公開デッキの一覧・投稿者ページ・いいねした人の一覧が
 * 同じ状態機械(先頭から読む → 「もっと見る」で足す → 条件が変わったら読み直す)を持つので1つにする。
 *
 *   - 条件変更後に古い応答が遅れて届いても反映しない(要求ごとの番号で弾く)
 *   - 読み込み中に先頭へ増えた項目が二度届いても ID で除く
 *   - 「もっと見る」の途中で条件が変わっても読み込み中のまま固まらない
 *
 * 読み込み中・エラーは「いま表示している key に対するもの」として導出し、effect の中で
 * 同期的に state を書き換えない。
 */
export function useOffsetPagination<T, M = undefined>({
  key,
  pageSize,
  fetchPage,
  getId,
  initial,
}: Options<T, M>) {
  const [loaded, setLoaded] = useState<Loaded<T, M> | null>(() =>
    initial && key !== null
      ? { key, items: initial.items, meta: initial.meta, hasMore: initial.items.length >= pageSize }
      : null,
  );
  const [failure, setFailure] = useState<{ key: string; error: Error } | null>(null);
  const [loadingMoreKey, setLoadingMoreKey] = useState<string | null>(null);

  // 要求ごとの番号。key が変わるたびに進め、古い応答を捨てる
  const requestSeq = useRef(0);
  // 初期値を使ってよい key(最初の key)。別の key になったら捨て、戻ってきたときは取り直す
  const seededKey = useRef<string | null>(initial && key !== null ? key : null);
  const fetchPageRef = useRef(fetchPage);
  const getIdRef = useRef(getId);
  useEffect(() => {
    fetchPageRef.current = fetchPage;
    getIdRef.current = getId;
  }, [fetchPage, getId]);

  const current = loaded && loaded.key === key ? loaded : null;
  const items = current?.items ?? [];
  const meta = current?.meta;
  // 直前に読み込めたページの付随情報(key は問わない)。条件を変えて読み直している間、
  // 環境名のように「前の応答の値をそのまま出しておいてよいもの」の表示に使う
  const lastMeta = loaded?.meta;
  const hasMore = current?.hasMore ?? false;
  const error = failure && failure.key === key ? failure.error : null;
  const isLoading = key !== null && current === null && error === null;
  const isLoadingMore = loadingMoreKey !== null && loadingMoreKey === key;

  useEffect(() => {
    const seq = ++requestSeq.current;
    if (key === null) return;
    if (seededKey.current === key) return;
    seededKey.current = null;

    fetchPageRef
      .current(0)
      .then((page) => {
        if (seq !== requestSeq.current) return;
        setLoaded({ key, items: page.items, meta: page.meta, hasMore: page.items.length >= pageSize });
      })
      .catch((e) => {
        if (seq !== requestSeq.current) return;
        setFailure({ key, error: toError(e) });
      });
  }, [key, pageSize]);

  const loadMore = useCallback(async () => {
    if (key === null || !current || isLoadingMore || !hasMore) return;

    const myKey = key;
    const seq = requestSeq.current;
    setLoadingMoreKey(myKey);
    setFailure(null);

    try {
      const page = await fetchPageRef.current(current.items.length);
      if (seq !== requestSeq.current) return;

      setLoaded((prev) => {
        if (!prev || prev.key !== myKey) return prev;
        const seen = new Set(prev.items.map(getIdRef.current));
        return {
          ...prev,
          items: [...prev.items, ...page.items.filter((item) => !seen.has(getIdRef.current(item)))],
          hasMore: page.items.length >= pageSize,
        };
      });
    } catch (e) {
      if (seq !== requestSeq.current) return;
      setFailure({ key: myKey, error: toError(e) });
    } finally {
      setLoadingMoreKey((prev) => (prev === myKey ? null : prev));
    }
  }, [key, current, isLoadingMore, hasMore, pageSize]);

  // いいねなどで1件だけ差し替える(ページをまたいで同じ項目に反映する)
  const updateItem = useCallback((item: T) => {
    const id = getIdRef.current(item);
    setLoaded((prev) =>
      prev ? { ...prev, items: prev.items.map((i) => (getIdRef.current(i) === id ? item : i)) } : prev,
    );
  }, []);

  return { items, meta, lastMeta, isLoading, isLoadingMore, hasMore, error, loadMore, updateItem };
}
