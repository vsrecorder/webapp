"use client";

import { useMemo } from "react";
import { useEffect, useRef, useState } from "react";

import { SetStateAction, Dispatch } from "react";

import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";

import { A11y, Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/scrollbar";

import CityleagueEventCard from "@app/components/organisms/Cityleague/CityleagueEventCard";
import CityleagueEventSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueEventSkeleton";

import { OfficialEventResponseType } from "@app/types/official_event";
import { CityleagueResultGetResponseType } from "@app/types/cityleague_result";

async function fetchCityleagueInfoByDate(league_type: number, date: string) {
  try {
    const res = await fetch(
      `/api/official_events?type_id=2&league_type=${league_type}&date=${date}`,
      {
        cache: "no-store",
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: OfficialEventResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

async function fetchCityleagueResultsByTerm(
  league_type: number,
  from_date: string,
  to_date: string,
) {
  try {
    const res = await fetch(
      `/api/cityleague_results?league_type=${league_type}&from_date=${from_date}&to_date=${to_date}`,
      {
        cache: "no-store",
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: CityleagueResultGetResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  league_type: number;
  setLeagueTypeCount: Dispatch<SetStateAction<number | undefined>>;
};

export default function CityleagueEvent({ league_type, setLeagueTypeCount }: Props) {
  const [cityleague, setCityleague] = useState<OfficialEventResponseType | null>(null);
  const [cityleagueResults, setCityleagueResults] =
    useState<CityleagueResultGetResponseType | null>(null);
  const [isLoading1, setIsLoading1] = useState(false);
  const [isLoading2, setIsLoading2] = useState(false);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);

  const sortedEvents = useMemo(() => {
    if (!cityleague?.official_events) return [];

    if (!cityleagueResults?.event_results) {
      return cityleague.official_events;
    }

    const orderMap = new Map(
      cityleagueResults.event_results.map((result, index) => [
        result.official_event_id,
        index,
      ]),
    );

    return [...cityleague.official_events].sort((a, b) => {
      const aIndex = orderMap.get(a.id);
      const bIndex = orderMap.get(b.id);

      // 両方 results に存在する
      if (aIndex !== undefined && bIndex !== undefined) {
        return aIndex - bIndex;
      }

      // 片方だけ存在する → results にある方を前に
      if (aIndex !== undefined) return -1;
      if (bIndex !== undefined) return 1;

      // 両方存在しない → 元順
      return 0;
    });
  }, [cityleague, cityleagueResults]);

  /*
   * 取得中かどうかの二重起動ガード。
   *
   * 以前は isLoading1/isLoading2(state)を見ていたが、これらは deps に入っていないため
   * effect が捕まえるのは実行時点の古い値だった。deps に足すと「取得完了で false に戻る
   * → deps が変わって再実行 → また取得」というループになるので入れられない、という
   * 行き詰まりになっていた(そのため exhaustive-deps の警告が出ていた)。
   * ガードは描画に使う値ではないので ref に移す。これで deps を正しく埋められる。
   *
   * あわせて deps から isInitialLoaded を外した。これは「初回の取得が済んだか」を
   * 表示側へ伝えるだけのフラグで、取得のきっかけではない。deps に居たせいで
   * 取得完了→true化→再実行、という余計な2回目の実行が起きていた。
   */
  const isLoadingRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      setIsLoading1(true);
      setIsLoading2(true);
      const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];

      const fetchfetchCityleagueInfoData = async () => {
        try {
          const data: OfficialEventResponseType = await fetchCityleagueInfoByDate(
            league_type,
            today,
          );
          setCityleague(data);
          setLeagueTypeCount(data.count);

          return;
        } catch (error) {
          console.error("Error loading items:", error);
        } finally {
          setIsLoading1(false);
          setIsInitialLoaded(true);
        }
      };

      const fetchfetchCityleagueResultsData = async () => {
        try {
          const data: CityleagueResultGetResponseType =
            await fetchCityleagueResultsByTerm(league_type, today, today);
          setCityleagueResults(data);

          return;
        } catch (error) {
          console.error("Error loading items:", error);
        } finally {
          setIsLoading2(false);
        }
      };

      // どちらも失敗しても reject しない作りなので、両方の完了でガードを解く
      await Promise.all([
        fetchfetchCityleagueInfoData(),
        fetchfetchCityleagueResultsData(),
      ]);
      isLoadingRef.current = false;
    };

    load();
  }, [league_type, setLeagueTypeCount]);

  return (
    <>
      {/* 空状態 */}
      {isInitialLoaded && !isLoading1 && cityleague?.count === 0 ? (
        <Swiper>
          <SwiperSlide className="p-3">
            <div className="text-center">
              <div className="">
                <Card className="pt-3 w-full">
                  <CardHeader className="pt-11.5 pb-9 px-3 flex-col items-center gap-0.5">
                    <div className="text-center">本日の開催はありません</div>
                  </CardHeader>
                  <CardBody className="px-0 py-1"></CardBody>
                  <CardFooter className="pt-1 pb-2"></CardFooter>
                </Card>
              </div>
            </div>
          </SwiperSlide>
        </Swiper>
      ) : (
        <>
          {/* ローディング表示 */}
          {isLoading1 || isLoading2 ? (
            <Swiper>
              <SwiperSlide className="p-3">
                <div className="text-center">
                  <CityleagueEventSkeleton />
                </div>
              </SwiperSlide>
            </Swiper>
          ) : (
            <div className="">
              <Swiper
                modules={[A11y, Autoplay, Pagination]}
                slidesPerView={"auto"}
                allowTouchMove={true}
                centeredSlides={true}
                loop={false}
                speed={1000}
                autoplay={{
                  delay: 1500,
                  disableOnInteraction: false,
                }}
                pagination={false}
              >
                {sortedEvents.map((event) => (
                  <SwiperSlide key={event.id} className="p-3">
                    <CityleagueEventCard
                      event={event}
                      results={
                        cityleagueResults
                          ? cityleagueResults?.event_results
                            ? cityleagueResults.event_results
                            : []
                          : []
                      }
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          )}
        </>
      )}
    </>
  );
}
