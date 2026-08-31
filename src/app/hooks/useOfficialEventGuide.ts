"use client";

import { useMemo } from "react";
import useSWR from "swr";

import { getEventTypeName } from "@app/components/organisms/Record/officialEventHelpers";
import { OfficialEventResponseType, OfficialEventType } from "@app/types/official_event";
import { detectOfficialEventKeyword } from "@app/utils/officialEventGuide";

async function fetcher(url: string): Promise<OfficialEventType[]> {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch");

  const ret: OfficialEventResponseType = await res.json();
  return ret.official_events;
}

/*
 * 自由形式の入力から公式イベントへ誘導すべきかを判定する。
 *
 * イベント名にキーワードが含まれるだけでは誘導しない。その開催日に同じ種別の公式イベントが
 * 実在するときだけ誘導する。候補が無い日に誘導すると、切り替えた先の選択欄が
 * 「イベントがありません」になり行き止まりになってしまうため。
 *
 * 種別の判定は officialEventHelpers.getEventTypeName(type_id ベース)を主に使う。
 * エクストラバトルの日・マイジムNo.1決定戦のように getEventTypeName が「その他」に
 * まとめる種別は拾えないため、イベント名からの検出も併用する。
 *
 * @param title    ユーザが入力したイベント名
 * @param dateYmd  開催日(YYYY-MM-DD)
 * @param enabled  自由形式を入力中のときだけ true。false の間は取得しない
 * @returns 誘導文に表示する公式イベント名。誘導しない場合は null
 */
export function useOfficialEventGuide(
  title: string,
  dateYmd: string,
  enabled: boolean = true,
): string | null {
  const keyword = detectOfficialEventKeyword(title);

  // キーワードを検出したときだけ取得する。URL は RecordCreate / OfficialEventSelect と
  // 同じ形式なので、同じ開催日を既に取得済みなら SWR のキャッシュを共有し再取得しない。
  const { data } = useSWR<OfficialEventType[], Error>(
    enabled && keyword ? `/api/official_events?date=${dateYmd}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  return useMemo(() => {
    if (!keyword || !data) return null;

    const hasCandidate = data.some(
      (officialEvent) =>
        getEventTypeName(officialEvent) === keyword ||
        detectOfficialEventKeyword(officialEvent.title) === keyword,
    );
    return hasCandidate ? keyword : null;
  }, [keyword, data]);
}
