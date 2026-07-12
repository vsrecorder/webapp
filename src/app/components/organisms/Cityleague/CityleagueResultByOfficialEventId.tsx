"use client";

import { useCallback, useEffect, useState } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Link as HeroLink } from "@heroui/react";
import { Image } from "@heroui/react";
import { Skeleton } from "@heroui/react";

import ScrollUpFloating from "@app/components/atoms/Floating/ScrollUpFloating";
import FetchError from "@app/components/molecules/FetchError";

import CityleagueResultCard from "@app/components/organisms/Cityleague/CityleagueResultCard";
import CityleagueResultCardSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueResultCardSkeleton";

import { CityleagueResultType } from "@app/types/cityleague_result";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";

async function fetchCityleagueResultByOfficialEventById(id: number) {
  try {
    const res = await fetch(`/api/cityleague_results/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: CityleagueResultType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

async function fetchOfficialEventById(id: number) {
  try {
    const res = await fetch(`/api/official_events/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: OfficialEventGetByIdResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  id: number;
};

export default function CityleagueResultByOfficialEventId({ id }: Props) {
  const [cityleagueResult, setCityleagueResult] = useState<CityleagueResultType | null>(
    null,
  );
  const [event, setEvent] = useState<OfficialEventGetByIdResponseType | null>(null);
  const [loading1, setLoading1] = useState(true);
  const [loading2, setLoading2] = useState(true);
  const [resultError, setResultError] = useState(false);
  const [eventError, setEventError] = useState(false);

  // シティリーグ結果だけを取得（失敗時のリロードから再利用）
  const loadCityleagueResult = useCallback(async () => {
    if (!id) {
      setLoading1(false);
      return;
    }

    setResultError(false);
    setLoading1(true);

    try {
      const data = await fetchCityleagueResultByOfficialEventById(id);
      setCityleagueResult(data);
    } catch (err) {
      console.log(err);
      setResultError(true);
    } finally {
      setLoading1(false);
    }
  }, [id]);

  // 公式イベント情報だけを取得
  const loadOfficialEvent = useCallback(async () => {
    if (!id) {
      setLoading2(false);
      return;
    }

    setEventError(false);
    setLoading2(true);

    try {
      const data = await fetchOfficialEventById(id);
      setEvent(data);
    } catch (err) {
      console.log(err);
      setEventError(true);
    } finally {
      setLoading2(false);
    }
  }, [id]);

  useEffect(() => {
    loadCityleagueResult();
    loadOfficialEvent();
  }, [loadCityleagueResult, loadOfficialEvent]);

  if (loading1 || loading2) {
    return (
      <div className="pt-3">
        <ScrollUpFloating />
        <Card className="pt-3 w-full">
          <CardHeader className="pt-0 pb-2 px-3 flex-col items-start gap-1.5">
            <small className="text-default-500">
              <Skeleton className="h-4 w-44" />
            </small>

            <div className="font-bold text-tiny">
              <Skeleton className="h-3 w-28" />
            </div>

            <div className="font-bold text-medium">
              <Skeleton className="h-5.5 w-50" />
            </div>

            <div className="flex flex-wrap items-start gap-1 pt-0">
              <Skeleton className="h-5.5 w-12 rounded-2xl" />
              <Skeleton className="h-5.5 w-21 rounded-2xl" />
              <Skeleton className="h-5.5 w-24 rounded-2xl" />
            </div>
          </CardHeader>
          <CardBody className="px-2 py-1">
            <div className="flex flex-col gap-3">
              <CityleagueResultCardSkeleton />
              <CityleagueResultCardSkeleton />
              <CityleagueResultCardSkeleton />
              <CityleagueResultCardSkeleton />
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (resultError) {
    return <FetchError onRetry={loadCityleagueResult} />;
  }

  if (eventError) {
    return <FetchError onRetry={loadOfficialEvent} />;
  }

  if (!cityleagueResult || cityleagueResult.results.length === 0 || !event) {
    return;
  }

  const date = new Date(event.date).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="pt-3">
      <ScrollUpFloating />
      <Card className="pt-3 w-full">
        <CardHeader className="pb-0 pt-0 px-3 flex-col items-start gap-0.5">
          {/* 両端配置 */}
          <div className="flex items-center justify-between w-full">
            <div>
              <small className="text-default-500">{event.title}</small>
              <div className="font-bold text-tiny">{date}</div>
              <div className="font-bold text-medium">
                {event.shop_name}
                <div className="flex flex-wrap items-start gap-1 pt-0.5">
                  <Chip size="sm" radius="md" variant="bordered">
                    <small className="font-bold">{event.prefecture_name}</small>
                  </Chip>
                  <Chip size="sm" radius="md" variant="bordered">
                    <small className="font-bold">{event.league_title}リーグ</small>
                  </Chip>
                  <Chip size="sm" radius="md" variant="bordered">
                    <small className="font-bold">『{event.environment_title}』</small>
                  </Chip>
                </div>
              </div>
            </div>

            <div className="z-0 shrink-0 translate-x-1 -translate-y-5">
              <HeroLink isExternal href={cityleagueResult.event_detail_result_url}>
                <Image
                  alt="シティリーグ"
                  src="https://xx8nnpgt.user.webaccel.jp/images/icons/city.png"
                  radius="none"
                  className="h-9 w-9 object-contain"
                />
              </HeroLink>
            </div>
          </div>
        </CardHeader>

        <CardBody className="px-2">
          <div className="flex flex-col gap-3">
            {cityleagueResult.results.map((result) => (
              <div key={result.player_id}>
                <CityleagueResultCard result={result} date={cityleagueResult.date} />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
