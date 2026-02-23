"use client";

import { useMemo } from "react";
import { useEffect, useState, useCallback } from "react";

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
};

export default function CityleagueEvent({ league_type }: Props) {
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

  useEffect(() => {
    const load = async () => {
      if (isLoading1 || isLoading2) return;

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

          return;
        } catch (error) {
          console.error("Error loading items:", error);
        } finally {
          setIsLoading1(false);

          if (!isInitialLoaded) {
            setIsInitialLoaded(true);
          }
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

      fetchfetchCityleagueInfoData();
      fetchfetchCityleagueResultsData();
    };

    load();
  }, [league_type, isInitialLoaded]);

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
                pagination={{
                  clickable: true,
                }}
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

                {/*}
                {cityleague?.official_events?.map((event, index) => (
                  <SwiperSlide key={index} className="p-3">
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
                */}
              </Swiper>
            </div>
          )}
        </>
      )}
    </>
  );
}
