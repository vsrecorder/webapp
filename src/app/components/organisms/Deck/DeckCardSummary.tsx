"use client";

import { useEffect, useState } from "react";

import { Chip } from "@heroui/react";
import { Skeleton } from "@heroui/react";
//import { Tabs, Tab } from "@heroui/tabs";

import { DeckCodeType } from "@app/types/deck_code";
import { DeckCardSummaryType } from "@app/types/deckcard";

async function fetchDeckCardSummary(code: string) {
  try {
    const res = await fetch(`/api/deckcards/${code}/summary`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: DeckCardSummaryType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

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

export default function DeckCardSummary({ deckcode }: Props) {
  const [deckcardSummary, setDeckCardSummary] = useState<DeckCardSummaryType | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deckcode) return;

    setLoading(true);

    const fetchCurrentDeckCardSummaryData = async () => {
      try {
        setLoading(true);
        const data = await fetchDeckCardSummary(deckcode.code);
        setDeckCardSummary(data);
      } catch (err) {
        console.log(err);
        setError("データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentDeckCardSummaryData();
  }, [deckcode]);

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
    return;
  }

  if (!deckcardSummary) return;

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="pb-0.5 pr-0">
        <div className="font-bold text-tiny pb-1">
          ポケモン：{deckcardSummary.card_pke_count}
        </div>
        <div className="pl-1 flex flex-wrap gap-1">
          {deckcardSummary.card_pke.map((deckcard, index) => (
            <div key={index}>
              <Chip
                size="sm"
                radius="md"
                color="default"
                variant="bordered"
                className="border-1.5 text-black"
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
          グッズ：{deckcardSummary.card_gds_count}
        </div>
        <div className="pl-1 flex flex-wrap gap-1">
          {deckcardSummary.card_gds.map((deckcard, index) => (
            <div key={index}>
              <Chip
                size="sm"
                radius="md"
                color="default"
                variant="bordered"
                className="border-1.5 text-black"
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
          ポケモンのどうぐ：{deckcardSummary.card_tool_count}
        </div>
        <div className="pl-1 flex flex-wrap gap-1">
          {deckcardSummary.card_tool.map((deckcard, index) => (
            <div key={index}>
              <Chip
                size="sm"
                radius="md"
                color="default"
                variant="bordered"
                className="border-1.5 text-black"
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
          サポート：{deckcardSummary.card_sup_count}
        </div>
        <div className="pl-1 flex flex-wrap gap-1">
          {deckcardSummary.card_sup.map((deckcard, index) => (
            <div key={index}>
              <Chip
                size="sm"
                radius="md"
                color="default"
                variant="bordered"
                className="border-1.5 text-black"
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
          スタジアム：{deckcardSummary.card_sta_count}
        </div>
        <div className="pl-1 flex flex-wrap gap-1">
          {deckcardSummary.card_sta.map((deckcard, index) => (
            <div key={index}>
              <Chip
                size="sm"
                radius="md"
                color="default"
                variant="bordered"
                className="border-1.5 text-black"
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
          エネルギー：{deckcardSummary.card_ene_count}
        </div>
        <div className="pl-1 flex flex-wrap gap-1">
          {deckcardSummary.card_ene.map((deckcard, index) => (
            <div key={index}>
              <Chip
                size="sm"
                radius="md"
                color="default"
                variant="bordered"
                className="border-1.5 text-black"
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

  /*
  return (
    <div className="w-full">
      <Tabs fullWidth size="sm">
        <Tab key="card_pke" title={`ポケモン：${deckcardSummary.card_pke_count}`}>
          <div className="pl-1 flex flex-wrap gap-1">
            {deckcardSummary.card_pke.map((deckcard, index) => (
              <div key={index}>
                <Chip
                  size="sm"
                  radius="md"
                  color="default"
                  variant="bordered"
                  className="border-1.5 text-black"
                >
                  <small className="font-bold">
                    {deckcard.card_name}: {deckcard.card_count}
                  </small>
                </Chip>
              </div>
            ))}
          </div>
        </Tab>
        <Tab key="card_gds" title={`グッズ：${deckcardSummary.card_gds_count}`}>
          <div className="pl-1 flex flex-wrap gap-1">
            {deckcardSummary.card_gds.map((deckcard, index) => (
              <div key={index}>
                <Chip
                  size="sm"
                  radius="md"
                  color="default"
                  variant="bordered"
                  className="border-1.5 text-black"
                >
                  <small className="font-bold">
                    {deckcard.card_name}: {deckcard.card_count}
                  </small>
                </Chip>
              </div>
            ))}
          </div>
        </Tab>
        <Tab
          key="card_tool"
          title={`ポケモンのどうぐ：${deckcardSummary.card_tool_count}`}
        >
          <div className="pl-1 flex flex-wrap gap-1">
            {deckcardSummary.card_tool.map((deckcard, index) => (
              <div key={index}>
                <Chip
                  size="sm"
                  radius="md"
                  color="default"
                  variant="bordered"
                  className="border-1.5 text-black"
                >
                  <small className="font-bold">
                    {deckcard.card_name}: {deckcard.card_count}
                  </small>
                </Chip>
              </div>
            ))}
          </div>
        </Tab>
        <Tab key="card_sup" title={`サポート：${deckcardSummary.card_sup_count}`}>
          <div className="pl-1 flex flex-wrap gap-1">
            {deckcardSummary.card_sup.map((deckcard, index) => (
              <div key={index}>
                <Chip
                  size="sm"
                  radius="md"
                  color="default"
                  variant="bordered"
                  className="border-1.5 text-black"
                >
                  <small className="font-bold">
                    {deckcard.card_name}: {deckcard.card_count}
                  </small>
                </Chip>
              </div>
            ))}
          </div>
        </Tab>
        <Tab key="card_sta" title={`スタジアム：${deckcardSummary.card_sta_count}`}>
          <div className="pl-1 flex flex-wrap gap-1">
            {deckcardSummary.card_sta.map((deckcard, index) => (
              <div key={index}>
                <Chip
                  size="sm"
                  radius="md"
                  color="default"
                  variant="bordered"
                  className="border-1.5 text-black"
                >
                  <small className="font-bold">
                    {deckcard.card_name}: {deckcard.card_count}
                  </small>
                </Chip>
              </div>
            ))}
          </div>
        </Tab>
        <Tab key="card_ene" title={`エネルギー：${deckcardSummary.card_ene_count}`}>
          <div className="pl-1 flex flex-wrap gap-1">
            {deckcardSummary.card_ene.map((deckcard, index) => (
              <div key={index}>
                <Chip
                  size="sm"
                  radius="md"
                  color="default"
                  variant="bordered"
                  className="border-1.5 text-black"
                >
                  <small className="font-bold">
                    {deckcard.card_name}: {deckcard.card_count}
                  </small>
                </Chip>
              </div>
            ))}
          </div>
        </Tab>
      </Tabs>
    </div>
  );
  */
}
