"use client";

import useSWR from "swr";

import { AcespecType } from "@app/types/acespec";
import { swrFetcher } from "@app/utils/deckCodePost";

// 204 = そのデッキに ACE SPEC が入っていない(swrFetcher は 204 を null で返す)
const fetcher = (url: string) => swrFetcher<AcespecType | null>(url);

/*
 * デッキコードの ACE SPEC を acespec API から引く。
 *
 * タイムラインでは投稿カードが画面に入ったときにだけ取りたいので、enabled が
 * false の間は取得しない。同じコードは SWR のキーで共有されるため、
 * 一覧・個別ページ・バージョン履歴で何度も取りに行かない。
 */
export function useAceSpec(code: string | null | undefined, enabled: boolean = true) {
  const { data, error, isLoading } = useSWR<AcespecType | null, Error>(
    code && enabled ? `/api/deckcards/${code}/acespec` : null,
    fetcher,
    // 同じコードの ACE SPEC は変わらないので、再表示・再接続で取り直さない
    // (並び替えや絞り込みでカードが作り直されるたびに全カード分の要求が飛ぶのを防ぐ)
    { revalidateOnFocus: false, revalidateIfStale: false, revalidateOnReconnect: false },
  );

  return {
    // undefined=未取得、null=ACE SPEC なし
    acespec: data,
    isLoading,
    error,
  };
}
