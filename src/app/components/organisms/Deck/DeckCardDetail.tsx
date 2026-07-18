"use client";

import { useCallback, useEffect, useState } from "react";

import { Chip } from "@heroui/react";
import { Skeleton } from "@heroui/react";

import FetchError from "@app/components/molecules/FetchError";

import { fetchDeckCardDetail } from "@app/utils/deckcard";

import { DeckCodeType } from "@app/types/deck_code";
import { DeckCardDetailType } from "@app/types/deckcard";

type Props = {
  deckcode: DeckCodeType | null;
};

function CardSkelton() {
  return (
    <div className="pl-1 flex flex-wrap gap-1">
      <div>
        <Skeleton className="h-6.5 w-24 rounded-2xl" />
      </div>
      <div>
        <Skeleton className="h-6.5 w-16 rounded-2xl" />
      </div>
      <div>
        <Skeleton className="h-6.5 w-18 rounded-2xl" />
      </div>
      <div>
        <Skeleton className="h-6.5 w-22 rounded-2xl" />
      </div>
      <div>
        <Skeleton className="h-6.5 w-26 rounded-2xl" />
      </div>
      <div>
        <Skeleton className="h-6.5 w-18 rounded-2xl" />
      </div>
      <div>
        <Skeleton className="h-6.5 w-22 rounded-2xl" />
      </div>
      <div>
        <Skeleton className="h-6.5 w-16 rounded-2xl" />
      </div>
    </div>
  );
}

export default function DeckCardDetail({ deckcode }: Props) {
  const [deckcardDetail, setDeckCardDetail] = useState<DeckCardDetailType | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // デッキカード内訳だけを取得（失敗時のリロードから再利用）
  const loadDeckCardDetail = useCallback(async () => {
    if (!deckcode) {
      setLoading(false);
      return;
    }

    setError(false);
    setLoading(true);

    try {
      const data = await fetchDeckCardDetail(deckcode.code);
      setDeckCardDetail(data);
    } catch (err) {
      console.log(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [deckcode]);

  useEffect(() => {
    loadDeckCardDetail();
  }, [loadDeckCardDetail]);

  if (!deckcode) return;

  if (loading) {
    return (
      <div className="flex flex-col gap-3 w-full">
        <div className="pb-0.5 pr-0">
          <div className="font-bold text-tiny pb-1">ポケモン</div>
          <CardSkelton />
        </div>

        <div className="pb-0.5 pr-0">
          <div className="font-bold text-tiny pb-1">グッズ</div>
          <CardSkelton />
        </div>

        <div className="pb-0.5 pr-0">
          <div className="font-bold text-tiny pb-1">ポケモンのどうぐ</div>
          <CardSkelton />
        </div>

        <div className="pb-0.5 pr-0">
          <div className="font-bold text-tiny pb-1">サポート</div>
          <CardSkelton />
        </div>

        <div className="pb-0.5 pr-0">
          <div className="font-bold text-tiny pb-1">スタジアム</div>
          <CardSkelton />
        </div>

        <div className="pb-0.5 pr-0">
          <div className="font-bold text-tiny pb-1">エネルギー</div>
          <CardSkelton />
        </div>
      </div>
    );
  }

  if (error) {
    return <FetchError onRetry={loadDeckCardDetail} compact />;
  }

  if (!deckcardDetail) return;

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="pb-0.5 pr-0">
        <div className="font-bold text-tiny pb-1">
          ポケモン：{deckcardDetail.card_pke_count}
        </div>
        <div className="pl-1 flex flex-wrap gap-1">
          {(deckcardDetail.card_pke ?? []).map((deckcard, index) => (
            <div key={index}>
              <Chip
                size="sm"
                radius="md"
                color="default"
                variant="bordered"
                className="border-1.5 text-foreground"
              >
                <small className="font-bold">
                  {deckcard.card_name}: {deckcard.card_count}
                </small>
              </Chip>
            </div>
          ))}
        </div>
      </div>
      <div className="pb-0.5 pr-0">
        <div className="font-bold text-tiny pb-1">
          グッズ：{deckcardDetail.card_gds_count}
        </div>
        <div className="pl-1 flex flex-wrap gap-1">
          {(deckcardDetail.card_gds ?? []).map((deckcard, index) => (
            <div key={index}>
              <Chip
                size="sm"
                radius="md"
                color="default"
                variant="bordered"
                className="border-1.5 text-foreground"
              >
                <small className="font-bold">
                  {deckcard.card_name}: {deckcard.card_count}
                </small>
              </Chip>
            </div>
          ))}
        </div>
      </div>
      <div className="pb-0.5 pr-0">
        <div className="font-bold text-tiny pb-1">
          ポケモンのどうぐ：{deckcardDetail.card_tool_count}
        </div>
        <div className="pl-1 flex flex-wrap gap-1">
          {(deckcardDetail.card_tool ?? []).map((deckcard, index) => (
            <div key={index}>
              <Chip
                size="sm"
                radius="md"
                color="default"
                variant="bordered"
                className="border-1.5 text-foreground"
              >
                <small className="font-bold">
                  {deckcard.card_name}: {deckcard.card_count}
                </small>
              </Chip>
            </div>
          ))}
        </div>
      </div>
      <div className="pb-0.5 pr-0">
        <div className="font-bold text-tiny pb-1">
          サポート：{deckcardDetail.card_sup_count}
        </div>
        <div className="pl-1 flex flex-wrap gap-1">
          {(deckcardDetail.card_sup ?? []).map((deckcard, index) => (
            <div key={index}>
              <Chip
                size="sm"
                radius="md"
                color="default"
                variant="bordered"
                className="border-1.5 text-foreground"
              >
                <small className="font-bold">
                  {deckcard.card_name}: {deckcard.card_count}
                </small>
              </Chip>
            </div>
          ))}
        </div>
      </div>
      <div className="pb-0.5 pr-0">
        <div className="font-bold text-tiny pb-1">
          スタジアム：{deckcardDetail.card_sta_count}
        </div>
        <div className="pl-1 flex flex-wrap gap-1">
          {(deckcardDetail.card_sta ?? []).map((deckcard, index) => (
            <div key={index}>
              <Chip
                size="sm"
                radius="md"
                color="default"
                variant="bordered"
                className="border-1.5 text-foreground"
              >
                <small className="font-bold">
                  {deckcard.card_name}: {deckcard.card_count}
                </small>
              </Chip>
            </div>
          ))}
        </div>
      </div>
      <div className="pb-0.5 pr-0">
        <div className="font-bold text-tiny pb-1">
          エネルギー：{deckcardDetail.card_ene_count}
        </div>
        <div className="pl-1 flex flex-wrap gap-1">
          {(deckcardDetail.card_ene ?? []).map((deckcard, index) => (
            <div key={index}>
              <Chip
                size="sm"
                radius="md"
                color="default"
                variant="bordered"
                className="border-1.5 text-foreground"
              >
                <small className="font-bold">
                  {deckcard.card_name}: {deckcard.card_count}
                </small>
              </Chip>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
