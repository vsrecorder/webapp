"use client";

import { useEffect, useRef, useState } from "react";

import { useDisclosure } from "@heroui/react";

import { useSeededResource } from "@app/hooks/useSeededResource";
import { DeckGetByIdResponseType } from "@app/types/deck";
import { MatchGetResponseType, MatchSummaryType } from "@app/types/match";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";
import { RecordCardDeckType, RecordGetByIdResponseType, RecordType } from "@app/types/record";
import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";
import { UnofficialEventGetByIdResponseType } from "@app/types/unofficial_event";
import { summarizeMatches } from "@app/utils/match";
import { REOPEN_MODAL_RECORD_ID } from "@app/utils/recordModalReopen";
import { writeSessionStorage } from "@app/utils/sessionStorageStore";
import { useSessionStorageItem } from "@app/hooks/useSessionStorageItem";

/*
 * 記録カード(公式 / Tonamel / 自由形式)で共通の状態。
 *
 * 一覧 API が各記録に付ける周辺情報(details: デッキ・対戦の集計・イベント)を初期値にし、
 * 無いときだけカードが自分で取る(useSeededResource)。イベントの取得は種別ごとに違うので
 * 各カードが持ち、ここでは共通のデッキ・対戦・記録本体・モーダル再開を扱う。
 */

// 記録一覧の各カード部品(OfficialEventRecord など)が受け取る props
export type RecordCardProps = {
  recordData: RecordType;
  enableDisplayRecordModal: boolean;
  onReopenComplete?: () => void;
  // 再開対象として reopenModalRecordId を消費してよいか。
  // 記録一覧では「すべて」タブと種別タブで同じ記録が重複マウントされるため、
  // アクティブなタブのインスタンスだけ true にしてキーの奪い合いを防ぐ。
  enableReopen?: boolean;
  // 親モーダルが落ち着き、記録モーダルを開いてよい状態か。
  // 親モーダル（デッキの記録一覧モーダル）が無い場合は常に true。
  reopenReady?: boolean;
  // デッキの記録一覧モーダル内で表示されているか（記録モーダルのバックドロップ調整用）。
  nestedInModal?: boolean;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

  return (await res.json()) as T;
}

// 周辺情報を自分で取るときの取得関数(一覧 API に details が無かったときだけ使う)
export const fetchOfficialEventById = (id: number) =>
  fetchJson<OfficialEventGetByIdResponseType>(`/api/official_events/${id}`);

export const fetchTonamelEventById = (id: string) =>
  fetchJson<TonamelEventGetByIdResponseType>(`/api/tonamel_events/${id}`);

export const fetchUnofficialEventById = (id: string) =>
  fetchJson<UnofficialEventGetByIdResponseType>(`/api/unofficial_events/${id}`);

const fetchDeckById = (id: string): Promise<RecordCardDeckType> =>
  fetchJson<DeckGetByIdResponseType>(`/api/decks/${id}`);

const fetchMatchSummary = async (recordId: string): Promise<MatchSummaryType> =>
  summarizeMatches(await fetchJson<MatchGetResponseType[]>(`/api/records/${recordId}/matches`));

// 対戦の集計が取れていない(取得中・失敗)ときの表示用
export const EMPTY_MATCH_SUMMARY: MatchSummaryType = {
  total: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  has_group_match: false,
  has_bo3: false,
};

type Options = Pick<
  RecordCardProps,
  "recordData" | "onReopenComplete" | "enableReopen" | "reopenReady"
> & {
  // イベント情報の取得中か。モーダルの再開はイベントが揃ってから行う
  eventLoading: boolean;
};

export function useRecordCard({
  recordData,
  onReopenComplete,
  enableReopen = true,
  reopenReady = true,
  eventLoading,
}: Options) {
  const [record, setRecord] = useState<RecordGetByIdResponseType | null>(recordData.data);

  // 一覧の取り直しで記録そのものが差し替わったら追随する
  // (記録モーダルからの更新は setRecord で入り、一覧側は変わらないので上書きされない)
  const dataRef = useRef(recordData.data);
  useEffect(() => {
    if (dataRef.current === recordData.data) return;
    dataRef.current = recordData.data;
    setRecord(recordData.data);
  }, [recordData.data]);

  const deck = useSeededResource(record?.deck_id, fetchDeckById, recordData.details?.deck);
  const matches = useSeededResource(
    record?.id,
    fetchMatchSummary,
    recordData.details?.matches,
  );

  const disclosure = useDisclosure();
  const { onOpen } = disclosure;

  // 最新の onReopenComplete(描画中に ref を書かず、effect で追随させる)
  const onReopenCompleteRef = useRef(onReopenComplete);
  useEffect(() => {
    onReopenCompleteRef.current = onReopenComplete;
  }, [onReopenComplete]);

  /*
   * この記録が戻り遷移の再開対象か。sessionStorage のフラグを「外部ストア」として描画中に読み
   * (useSessionStorageItem)、この記録の id と一致するときだけ。
   * 開いたらフラグを消す(一覧側の handleReopenComplete でも消す)ので、その場で false に戻る
   */
  const recordId = recordData.data.id;
  const pendingId = useSessionStorageItem(REOPEN_MODAL_RECORD_ID);
  const shouldReopen = enableReopen && pendingId !== null && pendingId === recordId;
  // 一度開いたら、同じ再開で開き直さない
  const reopenedRef = useRef(false);

  // イベント情報が揃ったらスクロール通知 + モーダルオープン。
  // 親モーダルが落ち着く（reopenReady）まで待ってから開く。
  useEffect(() => {
    if (!shouldReopen) {
      reopenedRef.current = false;
      return;
    }
    if (eventLoading || !reopenReady || reopenedRef.current) return;

    reopenedRef.current = true;
    onReopenCompleteRef.current?.();
    onOpen();
    writeSessionStorage(REOPEN_MODAL_RECORD_ID, null);
  }, [shouldReopen, eventLoading, reopenReady, onOpen]);

  return {
    record,
    setRecord,
    deck,
    // 集計が無い間は 0 勝 0 敗(「対戦なし」)として描く
    matchSummary: matches.data ?? EMPTY_MATCH_SUMMARY,
    loadingMatches: matches.loading,
    disclosure,
  };
}
