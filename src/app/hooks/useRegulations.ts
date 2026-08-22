"use client";

import useSWR from "swr";

import { FALLBACK_REGULATIONS, RegulationType } from "@app/types/regulation";

async function fetcher(url: string): Promise<RegulationType[]> {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

  return res.json();
}

/*
 * レギュレーション(スタンダード/エクストラ/殿堂/その他)のマスタ。
 *
 * 滅多に増減しないため、フォーカスのたびには引き直さない。取得前・取得失敗時は
 * FALLBACK_REGULATIONS を返す(マスタが引けないことを理由に記録の作成・変更を止めない)。
 */
export function useRegulations(): RegulationType[] {
  const { data } = useSWR<RegulationType[], Error>("/api/regulations", fetcher, {
    revalidateOnFocus: false,
  });

  return data?.length ? data : FALLBACK_REGULATIONS;
}
