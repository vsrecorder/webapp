"use client";

import useSWR from "swr";

import { OldestRecordEventDateType } from "@app/types/oldest_record_event_date";

/*
 * 記録されている最も古い対戦の event_date。「月次」の選択肢の起点に使う。
 *
 * SWR で持つ。ダッシュボードは「デッキ使用率分析」と「対戦相手のデッキ分析」を並べており、
 * 両方が同じ値を必要とする。素の fetch でパネルごとに取ると同じ API を2本叩くことになるが、
 * SWR ならキーが同じ取得はまとめられる。
 *
 * この値はほとんど変わらないので、フォーカス復帰での取り直しはしない。
 * 取得に失敗しても null を返すだけにする。呼び出し側はユーザー登録日や直近12ヶ月へ
 * フォールバックできるため、選択肢が少し狭くなるだけで画面は成り立つ。
 */
async function fetcher(url: string): Promise<string | null> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const data: OldestRecordEventDateType = await res.json();
  return data.event_date ?? null;
}

export default function useOldestRecordEventDate(
  userId: string | null | undefined,
  // デッキを指定すると、そのデッキの記録だけで最も古い日付を求める
  deckId?: string | null,
): string | null {
  const key = userId
    ? `/api/users/${userId}/oldest-record-event-date${deckId ? `?deck_id=${deckId}` : ""}`
    : null;

  const { data } = useSWR<string | null, Error>(key, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  return data ?? null;
}
