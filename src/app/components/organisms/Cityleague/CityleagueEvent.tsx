"use client";

import { useCallback, useMemo } from "react";
import { useEffect, useRef, useState } from "react";

import { SetStateAction, Dispatch } from "react";

import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";

import { A11y, Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/scrollbar";

import CityleagueEventCard from "@app/components/organisms/Cityleague/CityleagueEventCard";
import CityleagueEventSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueEventSkeleton";

import { OfficialEventResponseType } from "@app/types/official_event";
import { CityleagueResultGetResponseType } from "@app/types/cityleague_result";
import FetchErrorBox from "@app/components/molecules/FetchErrorBox";

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

    // 200 でも想定と違う形が返ることがある。一覧を配列として扱えるよう均しておく
    const official_events = Array.isArray(ret?.official_events)
      ? ret.official_events
      : [];

    return {
      ...ret,
      official_events,
      count: typeof ret?.count === "number" ? ret.count : official_events.length,
    };
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

    return {
      ...ret,
      event_results: Array.isArray(ret?.event_results) ? ret.event_results : [],
    };
  } catch (error) {
    throw error;
  }
}

type Props = {
  league_type: number;
  setLeagueTypeCount: Dispatch<SetStateAction<number | undefined>>;
  /*
   * 表示対象の日付("YYYY-MM-DD")。省略時は今日(JST)。
   * 開催期間外に次シーズン初日を先出しプレビュー表示するときだけ、この日付を渡す。
   */
  date?: string;
};

export default function CityleagueEvent({ league_type, setLeagueTypeCount, date }: Props) {
  // プレビュー表示か(=今日以外の日付を指定されている)。空状態・エラーの文言を「本日」から変える
  const isPreview = date !== undefined;
  const [cityleague, setCityleague] = useState<OfficialEventResponseType | null>(null);
  const [cityleagueResults, setCityleagueResults] =
    useState<CityleagueResultGetResponseType | null>(null);
  /*
   * 取得中かどうか。初期値は true(マウントするとすぐ取りに行くため)。
   *
   * false で始めると、サーバ描画とハイドレーション直後の最初の描画が「取得中でも空でもない」
   * 分岐に落ち、スライド0枚の Swiper(高さ0)が出ていた。ホームをリロードすると
   * パネルが一度潰れてから骨格・実体の順に伸び、下の節ごと上下に揺れていた
   * (390px 幅の実測でパネル 76px → 236px → 255px)。
   */
  const [isLoading1, setIsLoading1] = useState(true);
  const [isLoading2, setIsLoading2] = useState(true);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);
  // 開催情報を取れたか。取れないと1枚も出せないので、空(本日は開催なし)と区別して伝える
  const [isError, setIsError] = useState(false);
  // 「再読み込み」で取り直すためのキー。増やすと取得のeffectが走り直す
  const [reloadKey, setReloadKey] = useState(0);

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

  /*
   * 会場カードのモーダルを開いている間は、自動スライドを止める。
   * 止めないと、モーダルを見ている間も背面のカードが流れ続け、閉じたときには
   * タップした会場が画面から消えている。閉じたら再開する(次の切り替えは delay 後)。
   */
  const swiperRef = useRef<SwiperInstance | null>(null);
  const handleModalOpenChange = useCallback((isOpen: boolean) => {
    const swiper = swiperRef.current;
    // 取り直しで Swiper が作り直されると古いインスタンスは破棄済みになる
    if (!swiper || swiper.destroyed || !swiper.autoplay) return;
    const autoplay = swiper.autoplay;

    if (isOpen) {
      autoplay.stop();
    } else {
      autoplay.start();
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      setIsLoading1(true);
      setIsLoading2(true);
      const targetDate =
        date ?? new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];

      const fetchfetchCityleagueInfoData = async () => {
        try {
          const data: OfficialEventResponseType = await fetchCityleagueInfoByDate(
            league_type,
            targetDate,
          );
          setCityleague(data);
          setLeagueTypeCount(data.count);
          setIsError(false);

          return;
        } catch (error) {
          console.error("Error loading items:", error);
          // 開催情報が無いままでは1枚も描けない。「本日の開催はありません」と
          // 取り違えられないよう、取得できなかったことを表示側へ伝える
          setCityleague(null);
          setIsError(true);
        } finally {
          setIsLoading1(false);
          setIsInitialLoaded(true);
        }
      };

      const fetchfetchCityleagueResultsData = async () => {
        try {
          const data: CityleagueResultGetResponseType =
            await fetchCityleagueResultsByTerm(league_type, targetDate, targetDate);
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
  }, [league_type, setLeagueTypeCount, reloadKey, date]);

  return (
    <>
      {/* 取得できなかったとき。読み込み中・実体と同じ高さの枠で、取り直せるようにする */}
      {isInitialLoaded && !isLoading1 && isError ? (
        <Swiper>
          <SwiperSlide className="p-3">
            <FetchErrorBox
              sizer={
                <div className="text-center">
                  <CityleagueEventSkeleton />
                </div>
              }
              message={
                isPreview
                  ? "この日の開催情報を取得できませんでした"
                  : "本日の開催情報を取得できませんでした"
              }
              onRetry={() => setReloadKey((key) => key + 1)}
              isRetrying={isLoading1}
              // 枠は 136px しかなく、縦積み(約138px)では 26px はみ出す
              variant="row"
            />
          </SwiperSlide>
        </Swiper>
      ) : /* 空状態 */
      isInitialLoaded && !isLoading1 && cityleague?.count === 0 ? (
        <Swiper>
          <SwiperSlide className="p-3">
            <div className="text-center">
              <div className="">
                {/* 骨格(CityleagueEventSkeleton)・会場カードと同じ 136px にする。
                    pb-9 だと 138px で、開催の無い日は骨格から替わる瞬間に 2px 伸びていた */}
                <Card className="pt-3 w-full">
                  <CardHeader className="pt-11.5 pb-8.5 px-3 flex-col items-center gap-0.5">
                    <div className="text-center">
                      {isPreview ? "この日の開催はありません" : "本日の開催はありません"}
                    </div>
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
                onSwiper={(swiper) => {
                  swiperRef.current = swiper;
                }}
              >
                {sortedEvents.map((event) => (
                  <SwiperSlide key={event.id} className="p-3">
                    <CityleagueEventCard
                      event={event}
                      onModalOpenChange={handleModalOpenChange}
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
